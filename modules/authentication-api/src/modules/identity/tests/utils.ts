import { JwtTokenType } from '../../../config/types';
import {
  ICredential,
  ICredentialPresentation,
  SignCallback,
  Utils,
  Credential,
} from '@kiltprotocol/sdk-js';
import { generateJwtToken } from '@apillon/lib';
import { generateKeypairs } from '@apillon/authentication/src/lib/kilt';
import * as mock from './mock-data';
import { u8aToHex } from '@polkadot/util';

export async function setupDidCreateMock(): Promise<any> {
  const identityMock = mock.CREATE_IDENTITY_MOCK;
  const didMock = identityMock.did_create_op_data;
  const { keyAgreement } = await generateKeypairs(identityMock.mnemonic);

  const did_create_call = {
    data: didMock.encoded_data,
    signature: didMock.encoded_data,
  };

  const encryptedData = Utils.Crypto.encryptAsymmetric(
    JSON.stringify(did_create_call),
    mock.APILLON_ACC_ENCRYPT_KEY,
    u8aToHex(keyAgreement.secretKey),
  );

  const did_create_op = {
    payload: {
      message: u8aToHex(encryptedData.box),
      nonce: u8aToHex(encryptedData.nonce),
    },
    senderPubKey: u8aToHex(keyAgreement.publicKey),
  };

  const bodyMock = {
    email: identityMock.email,
    didUri: identityMock.did_uri,
    did_create_op: did_create_op,
    token: generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
      email: identityMock.email,
    }),
  };

  return {
    did_create_call: did_create_call,
    encrypted_data: encryptedData,
    did_create_op: did_create_op,
    claimer_encryption_key: keyAgreement,
    body_mock: bodyMock,
  };
}

export async function createPresentation(
  credential: ICredential,
  signCallback: SignCallback,
  challenge?: string,
): Promise<ICredentialPresentation> {
  // Create the presentation from credential, DID and challenge
  return Credential.createPresentation({
    credential,
    signCallback,
    challenge,
  });
}
