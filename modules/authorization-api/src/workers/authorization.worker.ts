import { HttpStatus } from '@nestjs/common';
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
import {
  CodeException,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
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
  AuthorizationErrorCode,
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

    // Check if correct attestation + state exists -> IN_PROGRESS
    const attestationDb = await new Attestation(
      {},
      this.context,
    ).populateByUserEmail(this.context, claimerEmail);

    if (
      !attestationDb.exists() ||
      attestationDb.state != AttestationState.IN_PROGRESS
    ) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthorizationErrorCode.ATTEST_INVALID_STATE,
        errorCodes: AuthorizationErrorCode,
      });
    }

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

    if (decrypted !== false) {
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
        message: `Submitting DID create TX ...'`,
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });

      await Blockchain.signAndSubmitTx(emailClaimTx, attesterAccount);
      const emailAttested = Boolean(
        await api.query.attestation.attestations(credential.rootHash),
      );

      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: `ATTESTATION ${claimerEmail} attested => ${emailAttested}`,
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });

      const claimerCredential = {
        ...credential,
        claimerSignature: {
          keyType: KILT_DERIVATION_SIGN_ALGORITHM,
          keyUri: claimerDidUri,
        },
      };

      attestationDb.populate({
        state: AttestationState.ATTESTED,
        credential: claimerCredential,
      });

      const conn = await this.context.mysql.start();
      try {
        await attestationDb.insert(SerializeFor.INSERT_DB, conn);
        await this.context.mysql.commit(conn);
      } catch (error) {
        await this.context.mysql.rollback(conn);
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: `Error creating attestation state for user with email ${claimerEmail}'`,
          location: 'AUTHORIZATION-API/attestation/authorization.worker',
          service: ServiceName.AUTHORIZATION,
        });
        throw new Error(error);
      }

      return true;
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `ATTESTATION ${claimerEmail} attested => FAILED`,
        location: 'AUTHORIZATION-API/attestation/authorization.worker',
        service: ServiceName.AUTHORIZATION,
      });
      throw new Error(error);
    }

    return false;
  }
}
