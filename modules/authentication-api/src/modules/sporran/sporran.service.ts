import {
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
import {
  APILLON_DAPP_NAME,
  AuthenticationErrorCode,
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
} from '@kiltprotocol/sdk-js';
import { encryptionSigner, generateKeypairs } from '../../lib/kilt';
import { JwtTokenType } from '../../config/types';
import { SporranSessionVerifyDto } from './dtos/sporran-session.dto';
import { DidUri } from '@kiltprotocol/types';
import { SubmitAttestationDto } from './dtos/message/submit-attestation.dto';
import { RequestCredentialDto } from './dtos/message/request-credential.dto';
import { prepareSignResources } from './sporran-utils';
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

    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      body.email,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    const credential: ICredential = {
      ...JSON.parse(identity.credential),
    };

    const message = Message.fromBody(
      {
        content: {
          attestation: {
            claimHash: credential.rootHash,
            cTypeHash: credential.claim.cTypeHash,
            owner: credential.claim.owner,
            delegationId: credential.delegationId,
            revoked: false,
          },
        },
        type: SporranMessageType.SUBMIT_ATTESTATION,
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
