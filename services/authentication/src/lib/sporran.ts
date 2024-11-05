import { env } from '@apillon/lib';
import { Did, DidUri } from '@kiltprotocol/sdk-js';
import { AuthenticationErrorCode } from '../config/types';
import { AuthenticationCodeException } from './exceptions';
import { connectToKilt, generateKeypairs } from './kilt';
import { randomChallenge } from './utils/crypto-utils';
import { ServiceContext } from '@apillon/service-lib';
import { HttpStatus } from '@nestjs/common';

export async function prepareSignResources(
  encryptionKeyUri: string,
  context: ServiceContext,
) {
  await connectToKilt(context);

  const requestChallenge = randomChallenge(24);
  // This is just the light did generated for the sporran session - not the actual claimer did uri
  const encryptKeyUri = `${encryptionKeyUri}`;
  const { did: claimerSessionDidUri } = Did.parse(encryptKeyUri as DidUri);
  const { authentication } = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
  const verifierDidUri = Did.getFullDidUriFromKey(authentication);
  const { document } = await Did.resolve(verifierDidUri);

  if (!document) {
    throw new AuthenticationCodeException({
      code: AuthenticationErrorCode.SPORRAN_VERIFIER_DID_DOES_NOT_EXIST,
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const verifierEncryptionKey = document.keyAgreement?.[0];
  if (!verifierEncryptionKey) {
    throw new AuthenticationCodeException({
      code: AuthenticationErrorCode.SPORRAN_VERIFIER_KA_DOES_NOT_EXIST,
      status: HttpStatus.BAD_REQUEST,
    });
  }

  return {
    verifierDidUri: verifierDidUri,
    encryptionKeyUri: encryptKeyUri,
    claimerSessionDidUri: claimerSessionDidUri,
    requestChallenge: requestChallenge,
  };
}
