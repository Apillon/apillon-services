import {
  CodeException,
  env,
  generateJwtToken,
  Lmas,
  LogType,
  parseJwtToken,
  ServiceName,
} from '@apillon/lib';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticationApiContext } from '../../context';
import { APILLON_DAPP_NAME, AuthenticationErrorCode } from '../../config/types';
import {
  ConfigService,
  Did,
  connect,
  DidResourceUri,
  Utils,
} from '@kiltprotocol/sdk-js';
import { generateKeypairsV2 } from '../../lib/kilt';
import { JwtTokenType } from '../../config/types';
import { SporranSessionVerifyDto } from './dtos/sporran-session.dto';

@Injectable()
export class SporranService {
  async getSessionValues(context: AuthenticationApiContext): Promise<any> {
    // generate keypairs
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const { authentication } = await generateKeypairsV2(
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
    const api = ConfigService.get('api');

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
      body.encryptionKeyId as DidResourceUri,
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

    let decryptedChallenge: any;
    const { keyAgreement } = await generateKeypairsV2(
      env.KILT_ATTESTER_MNEMONIC,
    );

    // const didUri = Did.getFullDidUriFromKey(authentication);

    // const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
    // const { document } = Did.linkedInfoFromChain(encodedFullDid);
    // // If there is no DID, or the DID does not have any key agreement key, return
    // if (!document.keyAgreement || !document.keyAgreement[0]) {
    //   throw new CodeException({
    //     status: HttpStatus.BAD_REQUEST,
    //     code: AuthenticationErrorCode.SPORRAN_INVALID_REQUEST,
    //     errorCodes: AuthenticationErrorCode,
    //   });
    // }

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
}
