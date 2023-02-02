import { env, CodeException } from '@apillon/lib';
import { Did, DidUri, connect } from '@kiltprotocol/sdk-js';
import { HttpStatus } from '@nestjs/common';
import { AuthenticationErrorCode } from '../../config/types';
import { randomChallenge, generateKeypairsV2 } from '../../lib/kilt';

export async function prepareSignResources(encryptionKeyUri: string) {
  await connect(env.KILT_NETWORK);

  const requestChallenge = randomChallenge(24);
  // This is just the light did generated for the sporran session - not the actual claimer did uri
  const encryptKeyUri = `${encryptionKeyUri}`;
  const { did: claimerSessionDidUri } = Did.parse(encryptKeyUri as DidUri);
  const { authentication } = await generateKeypairsV2(
    env.KILT_ATTESTER_MNEMONIC,
  );
  const verifierDidUri = Did.getFullDidUriFromKey(authentication);
  const { document } = await Did.resolve(verifierDidUri);
  if (!document) {
    throw new CodeException({
      status: HttpStatus.BAD_REQUEST,
      code: AuthenticationErrorCode.SPORRAN_VERIFIER_DID_DOES_NOT_EXIST,
      errorCodes: AuthenticationErrorCode,
    });
  }

  const verifierEncryptionKey = document.keyAgreement?.[0];
  if (!verifierEncryptionKey) {
    throw new CodeException({
      status: HttpStatus.BAD_REQUEST,
      code: AuthenticationErrorCode.SPORRAN_VERIFIER_KA_DOES_NOT_EXIST,
      errorCodes: AuthenticationErrorCode,
    });
  }

  return {
    verifierDidUri: verifierDidUri,
    encryptKeyUri: encryptKeyUri,
    claimerSessionDidUri: claimerSessionDidUri,
    requestChallenge: requestChallenge,
  };
}
