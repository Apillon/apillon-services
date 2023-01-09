import { JwtTokenType } from '../../../config/types';
import { Utils } from '@kiltprotocol/sdk-js';
import { generateJwtToken } from '@apillon/lib';
import { generateKeypairs } from '../../../lib/kilt';
import * as mock from './mock-data';
import { u8aToHex } from '@polkadot/util';

export const setupDidCreateMock = async () => {
  const identityMock = mock.CREATE_IDENTITY_MOCK;
  const didMock = identityMock.did_create_op_data;
  const { encryption } = await generateKeypairs(identityMock.mnemonic);

  const did_create_call = {
    data: didMock.encoded_data,
    signature: didMock.encoded_data,
  };

  const encryptedData = Utils.Crypto.encryptAsymmetric(
    JSON.stringify(did_create_call),
    mock.APILLON_ACC_ENCRYPT_KEY,
    u8aToHex(encryption.secretKey),
  );

  const did_create_op = {
    payload: {
      message: u8aToHex(encryptedData.box),
      nonce: u8aToHex(encryptedData.nonce),
    },
    senderPubKey: u8aToHex(encryption.publicKey),
  };

  const bodyMock = {
    email: identityMock.email,
    didUri: identityMock.did_uri,
    did_create_op: did_create_op,
    token: generateJwtToken(JwtTokenType.IDENTITY_EMAIL_VERIFICATION, {
      email: identityMock.email,
    }),
  };

  return {
    did_create_call: did_create_call,
    encrypted_data: encryptedData,
    did_create_op: did_create_op,
    claimer_encryption_key: encryption,
    body_mock: bodyMock,
  };
};
