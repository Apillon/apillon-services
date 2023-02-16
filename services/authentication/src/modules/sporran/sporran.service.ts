import {
  AppEnvironment,
  CodeException,
  env,
  generateJwtToken,
  Lmas,
  LogType,
  parseJwtToken,
  RequestCredentialDto,
  ServiceName,
  SporranSessionVerifyDto,
  SubmitAttestationDto,
  SubmitTermsDto,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HexString } from '@polkadot/util/types';
import {
  ApillonSupportedCTypes,
  APILLON_DAPP_NAME,
  AuthenticationErrorCode,
  IdentityGenFlag,
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
  Credential,
  KiltKeyringPair,
  Blockchain,
} from '@kiltprotocol/sdk-js';
import {
  encryptionSigner,
  generateAccount,
  generateKeypairs,
  getCtypeSchema,
} from '../../lib/kilt';
import { JwtTokenType } from '../../config/types';
import {
  DidUri,
  IEncryptedMessage,
  ISubmitTerms,
  PartialClaim,
} from '@kiltprotocol/types';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  QueueWorkerType,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { Identity } from '../identity/models/identity.model';
import { WorkerName } from '../../workers/worker-executor';
import { IdentityGenerateWorker } from '../../workers/generate-identity.worker';
import { prepareSignResources } from '../../lib/sporran';
import { VerifiableCredential } from '@kiltprotocol/vc-export';
import { VerifyCredentialDto } from '@apillon/lib/dist/lib/at-services/authentication/dtos/sporran/message/verify-credential.dto';

@Injectable()
export class SporranMicroservice {
  static async getSessionValues(context): Promise<any> {
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

  static async verifySession(
    event: { body: SporranSessionVerifyDto },
    context,
  ): Promise<any> {
    await connect(env.KILT_NETWORK);

    const encryptionKeyUri = event.body.encryptionKeyUri as DidResourceUri;
    const { sessionId, encryptedChallenge, nonce } = event.body;
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

    const encryptionKey = await Did.resolveKey(encryptionKeyUri);
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

  static async submitTerms(event: { body: SubmitTermsDto }, context) {
    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(event.body.encryptionKeyUri);

    const emailContents = {
      Email: event.body.email,
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

  static async submitAttestation(
    event: { body: SubmitAttestationDto },
    context,
  ) {
    await connect(env.KILT_NETWORK);

    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(event.body.encryptionKeyUri);

    const decryptionSenderKey = await Did.resolveKey(
      event.body.message.senderKeyUri as DidResourceUri,
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
          box: event.body.message.ciphertext,
          nonce: event.body.message.nonce,
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
      claimHash: credential.rootHash,
      cTypeHash:
        '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac' as HexString,
      owner: attestObj.owner,
      revoked: false,
    };

    const submitAttestationBody: ISubmitAttestation = {
      content: { attestation },
      type: SporranMessageType.SUBMIT_ATTESTATION,
    };

    Message.verifyMessageBody(submitAttestationBody);

    const message = Message.fromBody(
      submitAttestationBody,
      verifierDidUri,
      claimerSessionDidUri as DidUri,
    );

    // Set inReplyTo, since we are replying to a request
    message.inReplyTo = decryptedMessage.messageId;
    // Just a health-check
    Message.ensureOwnerIsSender(message);

    const encryptedMessage = await Message.encrypt(
      message,
      encryptionSigner,
      encryptionKeyUri as DidResourceUri,
    );

    return { message: encryptedMessage };
  }

  static async requestCredential(
    event: { body: RequestCredentialDto },
    context,
  ) {
    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(event.body.encryptionKeyUri);

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

    Message.verifyMessageBody(message.body);
    const encryptedMessage = await Message.encrypt(
      message,
      encryptionSigner,
      encryptionKeyUri as DidResourceUri,
    );

    return { message: encryptedMessage };
  }

  static async verifyCredential(event: { body: VerifyCredentialDto }, context) {
    const {
      verifierDidUri: verifierDidUri,
      encryptionKeyUri: encryptionKeyUri,
      claimerSessionDidUri: claimerSessionDidUri,
      requestChallenge: requestChallenge,
    } = await prepareSignResources(event.body.encryptionKeyUri);

    console.log('Verifying Sporran credential ...');

    const decryptionSenderKey = await Did.resolveKey(
      event.body.message.senderKeyUri as DidResourceUri,
    );

    const {
      authentication,
      keyAgreement,
      assertionMethod,
      capabilityDelegation,
    } = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    let decryptedMessage: any;
    try {
      decryptedMessage = Utils.Crypto.decryptAsymmetricAsStr(
        {
          box: event.body.message.ciphertext,
          nonce: event.body.message.nonce,
        },
        decryptionSenderKey.publicKey,
        keyAgreement.secretKey,
      );
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/sporran/verify-credential',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    const message = JSON.parse(decryptedMessage);
    const credential = message.body.content[0];

    await Credential.verifyPresentation(credential);

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const attestationChain = await api.query.attestation.attestations(
      credential.rootHash,
    );

    const attestation = Attestation.fromChain(
      attestationChain,
      credential.rootHash,
    );

    if (attestation.revoked) {
      await new Lmas().writeLog({
        logType: LogType.INFO,
        location: 'Authentication-API/sporran/verify-credential',
        service: ServiceName.AUTHENTICATION_API,
        data: 'Credential is revoked!',
      });
      return { verified: false };
    }

    // TODO: Here we can check if the attester is valid
    // if (isTrustedAttester(attestation.owner)) {
    //   console.log(
    //     "The claim is valid. Claimer's email:",
    //     credential.claim.contents.Email,
    //   );
    // }

    return { verified: true };
  }
}
