import {
  AppEnvironment,
  CodeException,
  env,
  generateJwtToken,
  Lmas,
  LogType,
  parseJwtToken,
  ServiceName,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticationApiContext } from '../../context';
import { HexString } from '@polkadot/util/types';
import {
  ApillonSupportedCTypes,
  APILLON_DAPP_NAME,
  AuthenticationErrorCode,
  IdentityGenFlag,
  IdentityState,
  SporranMessageType,
} from '../../config/types';
import {
  ConfigService,
  Did,
  connect,
  DidResourceUri,
  Utils,
  Message,
  ICredential,
  Attestation,
  ISubmitAttestation,
} from '@kiltprotocol/sdk-js';
import {
  encryptionSigner,
  generateKeypairs,
  getCtypeSchema,
} from '../../lib/kilt';
import { JwtTokenType } from '../../config/types';
import { SporranSessionVerifyDto } from './dtos/sporran-session.dto';
import {
  DidUri,
  IEncryptedMessage,
  ISubmitTerms,
  PartialClaim,
} from '@kiltprotocol/types';
import { SubmitAttestationDto } from './dtos/message/submit-attestation.dto';
import { RequestCredentialDto } from './dtos/message/request-credential.dto';
import { prepareSignResources } from './sporran-utils';
import { SubmitTermsDto } from './dtos/message/submit-terms.dto';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  QueueWorkerType,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { IdentityGenerateWorker } from '../../workers/generate-identity.worker';
import { Identity } from '../identity/models/identity.model';

@Injectable()
export class SporranService {
  async getSessionValues(context: AuthenticationApiContext): Promise<any> {
    // generate keypairs
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const { authentication } = await generateKeypairs(
      env.KILT_ATTESTER_MNEMONIC,
    );

    const didUri = Did.getFullDidUriFromKey(authentication);

    const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
    const { document } = Did.linkedInfoFromChain(encodedFullDid);
    // If there is no DID, or the DID does not have any key agreement key, return
    if (!document.keyAgreement || !document.keyAgreement[0]) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }
    const dAppEncryptionKeyUri =
      `${document.uri}${document.keyAgreement[0].id}` as DidResourceUri;

    const challenge = randomUUID();
    const token = generateJwtToken(JwtTokenType.SPORRAN_SESSION, {
      challenge: challenge,
    });

    return {
      dAppName: APILLON_DAPP_NAME,
      dAppEncryptionKeyUri: dAppEncryptionKeyUri,
      challenge: challenge,
      sessionId: token,
    };
  }

  async verifySession(
    context: AuthenticationApiContext,
    body: SporranSessionVerifyDto,
  ): Promise<any> {
    await connect(env.KILT_NETWORK);

    // Session id
    const { sessionId, encryptedChallenge, nonce } = body;
    let tokenData: any;
    try {
      tokenData = parseJwtToken(JwtTokenType.SPORRAN_SESSION, sessionId);
    } catch (error) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_VERIFICATION_TOKEN,
        errorCodes: AuthenticationErrorCode,
      });
    }

    const encryptionKey = await Did.resolveKey(
      body.encryptionKeyUri as DidResourceUri,
    );
    if (!encryptionKey) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/sporran/verify-session',
        service: ServiceName.AUTHENTICATION_API,
        data: 'Encryption key is not valid',
      });
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    const { keyAgreement } = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    let decryptedChallenge: any;
    try {
      // Decrypt incoming payload -> DID creation TX generated on FE
      decryptedChallenge = Utils.Crypto.decryptAsymmetricAsStr(
        {
          box: encryptedChallenge,
          nonce: nonce,
        },
        encryptionKey.publicKey,
        keyAgreement.secretKey,
      );
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/sporran/verify-session',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    if (
      !decryptedChallenge ||
      tokenData.challenge.toString() != decryptedChallenge.toString()
    ) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    return { success: true };
  }

  async submitTerms(context: AuthenticationApiContext, body: SubmitTermsDto) {
    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(body.encryptionKeyUri);

    const emailContents = {
      Email: body.email,
    };

    const partialClaim: PartialClaim = {
      // TODO: Move hash to types - constants
      cTypeHash:
        '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac' as HexString,
      contents: emailContents,
    };

    // We need to construct a message request for the sporran extension
    const messageBody: ISubmitTerms = {
      content: {
        claim: partialClaim,
        legitimations: [],
        cTypes: [getCtypeSchema(ApillonSupportedCTypes.EMAIL)],
      },
      type: SporranMessageType.SUBMIT_TERMS,
    };

    const message = Message.fromBody(
      { ...messageBody },
      verifierDidUri,
      claimerSessionDidUri as DidUri,
    );

    const encryptedMessage = (await Message.encrypt(
      message,
      encryptionSigner,
      encryptionKeyUri as DidResourceUri,
    )) as IEncryptedMessage;

    return { message: encryptedMessage };
  }

  async submitAttestation(
    context: AuthenticationApiContext,
    body: SubmitAttestationDto,
  ) {
    await connect(env.KILT_NETWORK);

    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(body.encryptionKeyUri);

    const decryptionSenderKey = await Did.resolveKey(
      body.message.senderKeyUri as DidResourceUri,
    );

    if (!decryptionSenderKey) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/sporran/verify-session',
        service: ServiceName.AUTHENTICATION_API,
        data: 'Encryption key is not valid',
      });
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    const { keyAgreement } = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    let decryptedMessage: any;
    try {
      decryptedMessage = Utils.Crypto.decryptAsymmetricAsStr(
        {
          box: body.message.ciphertext,
          nonce: body.message.nonce,
        },
        decryptionSenderKey.publicKey,
        keyAgreement.secretKey,
      );
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/sporran/submit-attestation',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    if (!decryptedMessage) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    const credential = JSON.parse(decryptedMessage).body.content.credential;
    const parameters = {
      credential: credential,
      args: [IdentityGenFlag.ATTESTATION],
      email: credential.claim.contents.Email,
      didUri: credential.claim.owner,
    };

    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      console.log('Starting DEV IdentityRevokeWorker worker ...');

      // Directly calls Kilt worker -> USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.IDENTITY_GENERATE_WORKER,
        {
          parameters,
        },
      );

      const worker = new IdentityGenerateWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor(parameters);
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.AUTH_AWS_WORKER_SQS_URL,
        WorkerName.IDENTITY_GENERATE_WORKER,
        [parameters],
        null,
        null,
      );
    }

    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      credential.claim.contents.Email,
    );

    const attestObj = Attestation.fromCredentialAndDid(
      // TODO: Should be a json attribute
      JSON.parse(identity.credential) as ICredential,
      verifierDidUri,
    );

    Attestation.verifyDataStructure(attestObj);

    const attestation = {
      delegationId: null,
      claimHash: credential.claim.contents.rootHash,
      cTypeHash:
        '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac' as HexString,
      owner: attestObj.owner,
      revoked: false,
    };

    const submitAttestationBody: ISubmitAttestation = {
      content: { attestation },
      type: SporranMessageType.SUBMIT_ATTESTATION,
    };

    const message = Message.fromBody(
      submitAttestationBody,
      verifierDidUri,
      claimerSessionDidUri as DidUri,
    );

    Message.ensureOwnerIsSender(message);

    const encryptedMessage = await Message.encrypt(
      message,
      encryptionSigner,
      encryptionKeyUri as DidResourceUri,
    );

    return { message: encryptedMessage };
  }

  async requestCredential(
    context: AuthenticationApiContext,
    body: RequestCredentialDto,
  ) {
    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(body.encryptionKeyUri);

    // We need to construct a message request for the sporran extension
    const message = Message.fromBody(
      {
        content: {
          cTypes: [
            {
              // TODO: MOVE TO kilt.getCtypeSchema!!!!!
              // NOTE: Hash of the email ctype
              cTypeHash:
                '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac',
              requiredProperties: ['Email'],
            },
          ],
          challenge: requestChallenge,
        },
        type: SporranMessageType.REQUEST_CREDENTIAL,
      },
      verifierDidUri,
      claimerSessionDidUri as DidUri,
    );

    const encryptedMessage = await Message.encrypt(
      message,
      encryptionSigner,
      encryptionKeyUri as DidResourceUri,
    );

    return { message: encryptedMessage };
  }
}
