import { u8aToHex, hexToU8a } from '@polkadot/util';
import { BN } from '@polkadot/util/bn/bn';
import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Utils,
  Blockchain,
  Did,
} from '@kiltprotocol/sdk-js';
import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  generateAccount,
  generateKeypairs,
  getFullDidDocument,
  getNextNonce,
  createAttestationRequest,
} from '../lib/kilt';
import { AuthorizationApiContext } from '../context';
import { Attestation } from '../modules/attestation/models/attestation.model';
import {
  AttestationState,
  KILT_DERIVATION_SIGN_ALGORITHM,
} from '../config/types';

export class AuthorizationWorker extends BaseQueueWorker {
  context: AuthorizationApiContext;

  // TODO: Handle errors and edge cases properly
  public constructor(
    workerDefinition: WorkerDefinition,
    context: AuthorizationApiContext,
    type: QueueWorkerType,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.AUTHORIZATION_AWS_WORKER_SQS_URL,
    );

    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(parameters: any): Promise<any> {
    // Input parameters
    const did_create_op = parameters.did_create_op;
    const claimerEmail = parameters.email;
    const claimerDidUri = parameters.didUri;

    // Generate (retrieve) attester did data
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    const attesterDidUri = attesterDidDoc.uri;

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    // Decrypt incoming payload -> DID creation TX generated on FE
    const decrypted = Utils.Crypto.decryptAsymmetricAsStr(
      {
        box: hexToU8a(did_create_op.payload.message),
        nonce: hexToU8a(did_create_op.payload.nonce),
      },
      did_create_op.senderPubKey,
      u8aToHex(attesterKeypairs.encryption.secretKey),
    );

    if (decrypted) {
      const payload = JSON.parse(decrypted);
      const data = hexToU8a(payload.data);
      const signature = hexToU8a(payload.signature);

      // Create DID create type and submit tx to Kilt BC
      try {
        const fullDidCreationTx = api.tx.did.create(data, {
          sr25519: signature,
        });

        await new Lmas().writeLog({
          logType: LogType.INFO,
          message: `Submitting DID create TX ...'`,
          location: 'AUTHORIZATION-API/attestation/authorization.worker',
          service: ServiceName.AUTHORIZATION,
        });

        await Blockchain.signAndSubmitTx(fullDidCreationTx, attesterAccount);
      } catch (error) {
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: error,
          location: 'AUTHORIZATION-API/attestation/authorization.worker',
          service: ServiceName.AUTHORIZATION,
        });

        throw new Error(error);
      }
    } else {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Decryption failed',
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });

      throw new Error('Decryption failed.');
    }

    // Prepare attestation instance and credential structure
    const { attestationInstance, credential } = createAttestationRequest(
      claimerEmail,
      attesterDidUri,
      claimerDidUri,
    );

    const attestation = api.tx.attestation.add(
      attestationInstance.claimHash,
      attestationInstance.cTypeHash,
      null,
    );

    const nextNonceBN = new BN(await getNextNonce(attesterDidUri));
    // Prepare claim TX
    const emailClaimTx = await Did.authorizeTx(
      attesterDidUri,
      attestation,
      async ({ data }) => ({
        signature: attesterKeypairs.assertion.sign(data),
        keyType: attesterKeypairs.assertion.type,
      }),
      attesterAccount.address,
      { txCounter: nextNonceBN },
    );

    try {
      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: `Submitting attestation TX ...'`,
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });

      await Blockchain.signAndSubmitTx(emailClaimTx, attesterAccount);
      const emailAttested = Boolean(
        await api.query.attestation.attestations(credential.rootHash),
      );

      await new Lmas().writeLog({
        logType: LogType.INFO,
        message:
          `Email ${claimerEmail} attestation => ` + emailAttested
            ? 'SUCCESS'
            : 'FALSE',
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });

      if (!emailAttested) {
        return false;
      }

      const claimerCredential = {
        ...credential,
        claimerSignature: {
          keyType: KILT_DERIVATION_SIGN_ALGORITHM,
          keyUri: claimerDidUri,
        },
      };

      // Check if correct attestation + state exists -> IN_PROGRESS
      const attestation = await new Attestation(
        {},
        this.context,
      ).populateByUserEmail(this.context, claimerEmail);

      attestation.populate({
        state: AttestationState.ATTESTED,
        credential: claimerCredential,
      });

      await attestation.update();
      return true;
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Email ${claimerEmail} attestation => ERROR`,
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });
    }
  }
}
