import { u8aToHex, hexToU8a, BN } from '@polkadot/util';
import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Utils,
  Blockchain,
  Did,
  ICredential,
} from '@kiltprotocol/sdk-js';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';

import { Identity } from '../modules/identity/models/identity.model';
import {
  AuthenticationErrorCode,
  HttpStatus,
  IdentityGenFlag,
  IdentityState,
  KiltSignAlgorithm,
} from '../config/types';
import {
  generateKeypairs,
  generateAccount,
  getFullDidDocument,
  createAttestationRequest,
  getNextNonce,
} from '../lib/kilt';
import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import { AuthenticationCodeException } from '../lib/exceptions';

export class IdentityGenerateWorker extends BaseQueueWorker {
  context;

  public constructor(
    workerDefinition: WorkerDefinition,
    context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.AUTH_AWS_WORKER_SQS_URL);
    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(params: any): Promise<any> {
    // Input parameters
    const did_create_op = params.did_create_op;
    const claimerEmail = params.email;
    const claimerDidUri = params.didUri;

    // Generate (retrieve) attester did data
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAcc = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    const attesterDidUri = attesterDidDoc.uri;

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    // Check if correct identity + state exists -> IN_PROGRESS
    const identity = await new Identity({}, this.context).populateByUserEmail(
      this.context,
      claimerEmail,
    );

    if (identity.exists() && identity.state == IdentityState.ATTESTED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_STATE,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (params.args.includes(IdentityGenFlag.FULL_IDENTITY)) {
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
        throw new AuthenticationCodeException({
          code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
          status: HttpStatus.BAD_REQUEST,
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

          await Blockchain.signAndSubmitTx(fullDidCreationTx, attesterAcc);
        } catch (error) {
          if (error.method == 'DidAlreadyPresent') {
            // If DID present on chain, signAndSubmitTx will throw an error
            await new Lmas().writeLog({
              logType: LogType.INFO, //!! This is NOT an error !!
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
        throw new AuthenticationCodeException({
          code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
          status: HttpStatus.BAD_REQUEST,
        });
      }
    }

    // Prepare identity instance and credential structure
    const { attestationRequest, credential } = createAttestationRequest(
      claimerEmail,
      attesterDidUri,
      claimerDidUri,
      params.credential as ICredential,
    );

    const attestation = api.tx.attestation.add(
      attestationRequest.claimHash,
      attestationRequest.cTypeHash,
      null,
    );

    const nextNonce = new BN(await getNextNonce(attesterDidUri));

    // Prepare claim TX
    const emailClaimTx = await Did.authorizeTx(
      attesterDidUri,
      attestation,
      async ({ data }) => ({
        signature: attesterKeypairs.assertionMethod.sign(data),
        keyType: attesterKeypairs.assertionMethod.type,
      }),
      attesterAcc.address,
      { txCounter: nextNonce },
    );

    try {
      await Blockchain.signAndSubmitTx(emailClaimTx, attesterAcc);
      const emailAttested = Boolean(
        await api.query.attestation.attestations(credential.rootHash),
      );

      await new Lmas().writeLog({
        logType: LogType.INFO,
        message:
          `Attestation for ${claimerEmail} => ` + emailAttested
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
          keyType: KiltSignAlgorithm.SR25519,
          keyUri: claimerDidUri,
        },
      };

      identity.populate({
        state: IdentityState.ATTESTED,
        credential: claimerCredential,
        didUri: params.didUri ? params.didUri : null,
      });

      if (identity.exists()) {
        await identity.update();
      } else {
        await identity.insert();
      }
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Email ${claimerEmail} identity => ERROR`,
        location: 'AUTHENTICATION-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
    }

    return false;
  }
}
