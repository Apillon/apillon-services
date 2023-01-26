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
import { CodeException, env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  getFullDidDocument,
  getNextNonce,
  createAttestationRequest,
  getKeypairs,
  getAccount,
} from '../lib/kilt';
import { AuthenticationApiContext } from '../context';
import { Identity } from '../modules/identity/models/identity.model';
import {
  AuthenticationErrorCode,
  IdentityState,
  KILT_DERIVATION_SIGN_ALGORITHM,
} from '../config/types';
import { HttpStatus } from '@nestjs/common';

export class AuthenticationWorker extends BaseQueueWorker {
  context: AuthenticationApiContext;

  // TODO: Handle errors and edge cases properly
  public constructor(
    workerDefinition: WorkerDefinition,
    context: AuthenticationApiContext,
    type: QueueWorkerType,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.AUTHENTICATION_AWS_WORKER_SQS_URL,
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
    const attesterKeypairs = await getKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await getAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    const attesterDidUri = attesterDidDoc.uri;

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    let decrypted: any;
    try {
      // Decrypt incoming payload -> DID creation TX generated on FE
      decrypted = Utils.Crypto.decryptAsymmetricAsStr(
        {
          box: hexToU8a(did_create_op.payload.message),
          nonce: hexToU8a(did_create_op.payload.nonce),
        },
        did_create_op.senderPubKey,
        u8aToHex(attesterKeypairs.keyAgreement.secretKey),
      );
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

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
          message: `Propagating DID create TX to KILT BC ...`,
          location: 'AUTHENTICATION-API/identity/authentication.worker',
          service: ServiceName.AUTHENTICATION_API,
        });

        await Blockchain.signAndSubmitTx(fullDidCreationTx, attesterAccount);
      } catch (error) {
        if (error.method == 'DidAlreadyPresent') {
          // If DID present on chain, signAndSubmitTx will throw an error
          await new Lmas().writeLog({
            logType: LogType.INFO, //!! This is not an error !!
            message: `${error.method}: ${error.docs[0]}`,
            location: 'Authentication-API/identity/authentication.worker',
            service: ServiceName.AUTHENTICATION_API,
            data: error,
          });
        } else {
          await new Lmas().writeLog({
            logType: LogType.ERROR,
            location: 'Authentication-API/identity/authentication.worker',
            service: ServiceName.AUTHENTICATION_API,
            data: error,
          });
          throw error;
        }
      }
    } else {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    // Prepare identity instance and credential structure
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
      await Blockchain.signAndSubmitTx(emailClaimTx, attesterAccount);
      const emailAttested = Boolean(
        await api.query.attestation.attestations(credential.rootHash),
      );

      await new Lmas().writeLog({
        logType: LogType.INFO,
        message:
          `Email ${claimerEmail} identity => ` + emailAttested
            ? 'SUCCESS'
            : 'FALSE',
        location: 'AUTHENTICATION-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
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

      // Check if correct identity + state exists -> IN_PROGRESS
      const identity = await new Identity({}, this.context).populateByUserEmail(
        this.context,
        claimerEmail,
      );

      identity.populate({
        state: IdentityState.ATTESTED,
        credential: claimerCredential,
        didUri: parameters.didUri, // TODO: Maybe better to get from document
      });

      await identity.update();
      return true;
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Email ${claimerEmail} identity => ERROR`,
        location: 'AUTHENTICATION-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
    }
  }
}
