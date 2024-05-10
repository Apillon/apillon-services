import {
  CodeException,
  env,
  generateJwtToken,
  JwtExpireTime,
  JwtTokenType,
  Lmas,
  LogType,
  parseJwtToken,
  RequestCredentialDto,
  ServiceName,
  SporranSessionVerifyDto,
  SubmitAttestationDto,
  SubmitTermsDto,
  VerifyCredentialDto,
} from '@apillon/lib';
import { randomUUID } from 'crypto';
import { HexString } from '@polkadot/util/types';
import {
  ApillonSupportedCTypes,
  APILLON_DAPP_NAME,
  AuthenticationErrorCode,
  HttpStatus,
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
  IAttestation,
} from '@kiltprotocol/sdk-js';
import {
  encryptionSigner,
  generateKeypairs,
  getCtypeSchema,
} from '../../lib/kilt';
import {
  DidUri,
  ICredentialPresentation,
  IEncryptedMessage,
  ISubmitTerms,
  PartialClaim,
} from '@kiltprotocol/types';

import { Identity } from '../identity/models/identity.model';
import { prepareSignResources } from '../../lib/sporran';
import { AuthenticationCodeException } from '../../lib/exceptions';

export class SporranService {
  static async getSessionValues(_context): Promise<any> {
    // generate keypairs
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const { authentication } = await generateKeypairs(
      env.KILT_ATTESTER_MNEMONIC,
    );

    const didUri = Did.getFullDidUriFromKey(authentication);

    const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
    const { document } = Did.linkedInfoFromChain(encodedFullDid as any);
    // If there is no DID, or the DID does not have any key agreement key, return
    if (!document.keyAgreement || !document.keyAgreement[0]) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const dAppEncryptionKeyUri =
      `${document.uri}${document.keyAgreement[0].id}` as DidResourceUri;

    const challenge = randomUUID();
    const token = generateJwtToken(JwtTokenType.SPORRAN_SESSION, {
      challenge,
    });

    return {
      dAppName: APILLON_DAPP_NAME,
      dAppEncryptionKeyUri,
      challenge,
      sessionId: token,
    };
  }

  static async verifySession(
    event: { body: SporranSessionVerifyDto },
    _context,
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
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const { keyAgreement } = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    let decryptedChallenge: any;
    try {
      // Decrypt incoming payload -> DID creation TX generated on FE
      decryptedChallenge = Utils.Crypto.decryptAsymmetricAsStr(
        {
          box: encryptedChallenge,
          nonce,
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
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (
      !decryptedChallenge ||
      tokenData.challenge.toString() != decryptedChallenge.toString()
    ) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return { success: true };
  }

  static async submitTerms(event: { body: SubmitTermsDto }, _context) {
    const {
      verifierDidUri,
      encryptionKeyUri,
      claimerSessionDidUri,
      // requestChallenge,
    } = await prepareSignResources(event.body.encryptionKeyUri);

    const emailContents = {
      Email: event.body.email,
    };

    const partialClaim: PartialClaim = {
      // TODO: Move hash to types - constants
      cTypeHash:
        '0x9d271c790775ee831352291f01c5d04c7979713a5896dcf5e81708184cc5c643' as HexString,
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

    const { verifierDidUri, encryptionKeyUri, claimerSessionDidUri } =
      await prepareSignResources(event.body.encryptionKeyUri);

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
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
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
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (!decryptedMessage) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const credential = JSON.parse(decryptedMessage).body.content.credential;

    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      credential.claim.contents.Email,
    );

    const attestObj = Attestation.fromCredentialAndDid(
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
    _context,
  ) {
    const {
      verifierDidUri,
      encryptionKeyUri,
      claimerSessionDidUri,
      requestChallenge,
    } = await prepareSignResources(event.body.encryptionKeyUri);

    // We need to construct a message request for the sporran extension
    const message = Message.fromBody(
      {
        content: {
          cTypes: [
            {
              // NOTE: Hash of the email ctype
              cTypeHash:
                '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac' as HexString,
              // Here we specify which properties of the cType are *required
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
    console.log('Verifying Sporran credential ...');
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const decryptionSenderKey = await Did.resolveKey(
      event.body.message.senderKeyUri as DidResourceUri,
    );

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
        location: 'Authentication-API/sporran/verify-credential',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const message = JSON.parse(decryptedMessage);
    const presentation = message.body.content[0] as ICredentialPresentation;
    let attestation: IAttestation;

    try {
      await Credential.verifyPresentation(presentation);

      attestation = Attestation.fromChain(
        (await api.query.attestation.attestations(
          presentation.rootHash,
        )) as any,
        presentation.rootHash,
      );
    } catch (error) {
      return {
        verified: false,
        error: error.message.replace(/['"]+/g, ''),
      };
    }

    const whitelist = env.KILT_ATTESTERS_WHITELIST.split(';');
    if (!whitelist.includes(attestation.owner.split('did:kilt:')[1])) {
      await new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        message: 'VERIFICATION FAILED: Unknown attester',
        location: 'AUTHENTICATION/sporran/verifyCredential',
        service: ServiceName.AUTHENTICATION_API,
      });

      return {
        verified: false,
        error: 'Verification failed',
      };
    }

    if (attestation.revoked) {
      await new Lmas().writeLog({
        logType: LogType.INFO,
        location: 'Authentication-API/sporran/verify-credential',
        service: ServiceName.AUTHENTICATION_API,
        data: 'Credential is revoked!',
      });
      return { verified: false };
    }

    const email = presentation.claim.contents.Email as string;
    const { project_uuid } = parseJwtToken(
      JwtTokenType.AUTH_SESSION,
      event.body.token,
    );
    const token = generateJwtToken(
      JwtTokenType.OAUTH_TOKEN,
      { email, project_uuid },
      JwtExpireTime.TWENTY_MINUTES,
    );

    return { verified: true, token };
  }
}
