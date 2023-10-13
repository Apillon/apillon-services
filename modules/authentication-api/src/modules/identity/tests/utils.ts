import {
  ICredential,
  ICredentialPresentation,
  SignCallback,
  Credential,
  KiltKeyringPair,
  NewDidEncryptionKey,
  Utils,
  connect,
  ConfigService,
  Did,
} from '@kiltprotocol/sdk-js';
import { JwtTokenType, env, generateJwtToken } from '@apillon/lib';
import * as mock from './mock-data';
import { u8aToHex } from '@polkadot/util';
import {
  blake2AsU8a,
  keyExtractPath,
  keyFromPath,
  mnemonicToMiniSecret,
  naclBoxPairFromSecret,
  sr25519PairFromSeed,
} from '@polkadot/util-crypto';
import { Keypair } from '@polkadot/util-crypto/types';

export async function setupDidCreateMock(): Promise<any> {
  const identityMock = mock.CREATE_IDENTITY_MOCK;
  const didMock = identityMock.did_create_op_data;
  const { keyAgreement } = await generateKeypairs(identityMock.mnemonic);

  const did_create_call = {
    data: didMock.encoded_data,
    signature: didMock.encoded_data,
  };

  const encryptedData = await encryptAsymmetric(
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

export async function decryptAsymmetric(
  encryptedData: any,
  publicKey: any,
  secretKey: any,
) {
  return Utils.Crypto.decryptAsymmetricAsStr(
    {
      box: encryptedData.payload.message,
      nonce: encryptedData.payload.nonce,
    },
    publicKey,
    secretKey,
  );
}

export async function encryptAsymmetric(
  data: any,
  publicKeyA: any,
  secretKeyB: any,
) {
  return Utils.Crypto.encryptAsymmetric(data, publicKeyA, secretKeyB);
}

export function generateAccount(mnemonic: string) {
  const signingKeyPairType = 'sr25519';
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  });
  return keyring.addFromMnemonic(mnemonic);
}

export async function generateKeypairs(mnemonic: string) {
  const account = generateAccount(mnemonic);
  // Authenticates the DID owner
  const authentication = {
    ...account.derive('//did//0'),
    type: 'sr25519',
  } as KiltKeyringPair;

  // Key used to sign transactions
  const assertionMethod = {
    ...account.derive('//did//assertion//0'),
    type: 'sr25519',
  } as KiltKeyringPair;
  // Key used for authority delgation
  const capabilityDelegation = {
    ...account.derive('//did//delegation//0'),
    type: 'sr25519',
  } as KiltKeyringPair;

  // Used to encrypt and decrypt messages
  const keyAgreement: NewDidEncryptionKey & Keypair = (function () {
    const secretKeyPair = sr25519PairFromSeed(mnemonicToMiniSecret(mnemonic));
    const { path } = keyExtractPath('//did//keyAgreement//0');
    const { secretKey } = keyFromPath(secretKeyPair, path, 'sr25519');
    return {
      ...naclBoxPairFromSecret(blake2AsU8a(secretKey)),
      type: 'x25519',
    };
  })();

  return {
    authentication: authentication,
    keyAgreement: keyAgreement,
    assertionMethod: assertionMethod,
    capabilityDelegation: capabilityDelegation,
  };
}

export async function getFullDidDocument(keypairs: any) {
  await connect(env.KILT_NETWORK);
  const api = ConfigService.get('api');
  const didUri = Did.getFullDidUriFromKey(keypairs.authentication);
  const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
  const { document } = Did.linkedInfoFromChain(encodedFullDid);

  if (!document) {
    throw 'No documento';
  }

  return document;
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
