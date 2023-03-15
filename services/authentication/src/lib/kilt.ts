import {
  blake2AsU8a,
  keyExtractPath,
  keyFromPath,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  naclBoxPairFromSecret,
  randomAsHex,
  sr25519PairFromSeed,
} from '@polkadot/util-crypto';
import { isHex } from '@polkadot/util';
import {
  ConfigService,
  Did,
  KiltKeyringPair,
  Utils,
  connect,
  ICType,
  CType,
  Claim,
  Attestation,
  Credential,
  DidUri,
  NewDidEncryptionKey,
  SignCallback,
  DidDocument,
  SignExtrinsicCallback,
  ICredential,
  ICredentialPresentation,
  Blockchain,
  NewDidVerificationKey,
} from '@kiltprotocol/sdk-js';
import {
  ApillonSupportedCTypes,
  KILT_CREDENTIAL_IRI_PREFIX,
  AuthenticationErrorCode,
  HttpStatus,
} from '../config/types';
import { EncryptResponseData } from '@kiltprotocol/types';
import { Keypair } from '@polkadot/util-crypto/types';
import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import { AuthenticationCodeException } from './exceptions';

export function generateMnemonic() {
  return mnemonicGenerate();
}

// This function basically creates a keyring - wallet, from a mnemonic
// The MNEMONIC is a MASTER KEY - it unlocks all the other UTILITY KEYS
// The utility keys are bound to the master key (the wallet or the account)
// The mnemonic can't be changed. Once lost, it cannot be retrieved.
// The utility keys can be replaced if compromised - using the master key
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
    await new Lmas().writeLog({
      logType: LogType.INFO,
      // This is not an error!! getFullDidDocument is used to query document state
      message: `KILT => DID DOCUMENT DOES NOT EXIST`,
      location: 'AUTHENTICATION-API/identity/identity.service.ts',
      service: ServiceName.AUTHENTICATION_API,
    });

    return null;
  }

  return document;
}

export function createAttestationRequest(
  email: string,
  attesterDidUri: DidUri,
  claimerDidUri: DidUri,
  credential?: ICredential,
) {
  let authCredential = credential;
  if (!authCredential) {
    const emailCType = getCtypeSchema(ApillonSupportedCTypes.EMAIL);
    const emailContents = {
      Email: email,
    };

    const authClaim = Claim.fromCTypeAndClaimContents(
      emailCType,
      emailContents,
      claimerDidUri,
    );

    authCredential = Credential.fromClaim(authClaim);
  }

  return {
    attestationRequest: Attestation.fromCredentialAndDid(
      authCredential,
      attesterDidUri,
    ),
    credential: authCredential,
  };
}

export function getCtypeSchema(ctype: string): ICType {
  // NOTE: These are official CTypes created by Kilt
  switch (ctype) {
    case ApillonSupportedCTypes.EMAIL: {
      return CType.fromProperties('Email', {
        Email: {
          type: 'string',
        },
      });
    }
    case ApillonSupportedCTypes.DOMAIN_LINKAGE: {
      // From https://github.com/KILTprotocol/ctype-index/blob/main/ctypes/0x9d271c790775ee831352291f01c5d04c7979713a5896dcf5e81708184cc5c643/ctype.json
      return CType.fromProperties('Domain Linkage Credential', {
        origin: {
          type: 'string',
        },
      });
    }
    default: {
      throw `Invalid CType: ${ctype}`;
    }
  }
}

export async function getNextNonce(didUri: DidUri) {
  const api = ConfigService.get('api');
  const queried = await api.query.did.did(Did.toChain(didUri));
  const currentNonce = parseInt(
    Did.documentFromChain(queried).lastTxCounter.toString(),
  );
  return currentNonce + 1;
}

export async function createCompleteFullDid(
  submitterAccount: KiltKeyringPair,
  {
    authentication,
    keyAgreement,
    assertionMethod,
    capabilityDelegation,
  }: {
    authentication: NewDidVerificationKey;
    keyAgreement: NewDidEncryptionKey;
    assertionMethod: NewDidVerificationKey;
    capabilityDelegation: NewDidVerificationKey;
  },
  signCallback: SignExtrinsicCallback,
): Promise<DidDocument> {
  const api = ConfigService.get('api');

  const fullDidCreationTx = await Did.getStoreTx(
    {
      authentication: [authentication],
      keyAgreement: [keyAgreement],
      assertionMethod: [assertionMethod],
      capabilityDelegation: [capabilityDelegation],
      // Example service.
      service: [],
    },
    submitterAccount.address,
    signCallback,
  );

  try {
    console.log('Submitting document create TX to bc ...');
    await Blockchain.signAndSubmitTx(fullDidCreationTx, submitterAccount);
  } catch (error) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      message: 'DID create TX failed',
      location: 'Authentication Service',
      service: ServiceName.AUTHENTICATION_API,
    });
  }

  // The new information is fetched from the blockchain and returned.
  const fullDid = Did.getFullDidUriFromKey(authentication);
  const encodedUpdatedDidDetails = await api.call.did.query(
    Did.toChain(fullDid),
  );
  return Did.linkedInfoFromChain(encodedUpdatedDidDetails).document;
}

// SECTION - Sign callbacks
// Various sign callbacks used in Kilt operations
export async function authenticationSigner({
  authentication,
}: {
  authentication: KiltKeyringPair;
}): Promise<SignExtrinsicCallback> {
  if (!authentication) {
    throw new Error('no authentication key');
  }

  return async ({ data }) => ({
    signature: authentication.sign(data),
    keyType: authentication.type,
  });
}

export async function assertionSigner({
  assertion,
  didDocument,
}: {
  assertion: KiltKeyringPair;
  didDocument: DidDocument;
}): Promise<SignCallback> {
  const { assertionMethod } = didDocument;
  if (!assertionMethod) {
    throw new Error('no assertionMethod key');
  }

  return async ({ data }) => ({
    signature: assertion.sign(data),
    keyType: assertion.type,
    keyUri: `${didDocument.uri}${assertionMethod[0].id}`,
  });
}

export async function encryptionSigner({
  data,
  peerPublicKey,
  // Did URI
  // NOTE: I think encyption signer (EncryptRequestData) needs this did,
  // but we don't use it in the function body actually
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  did,
}): Promise<EncryptResponseData> {
  // Apillon credentials
  const keyPairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

  const verifierDidDoc = await getFullDidDocument(keyPairs);
  const verifierEncryptionKey = verifierDidDoc.keyAgreement?.[0];
  if (!verifierEncryptionKey) {
    throw new AuthenticationCodeException({
      code: AuthenticationErrorCode.SPORRAN_VERIFIER_KA_DOES_NOT_EXIST,
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const { box, nonce } = Utils.Crypto.encryptAsymmetric(
    data,
    peerPublicKey,
    keyPairs.keyAgreement.secretKey,
  );

  return {
    data: box,
    nonce,
    keyUri: `${verifierDidDoc.uri}${verifierEncryptionKey.id}`,
  };
}
// ENDSECTION

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

export function randomChallenge(size = 16) {
  return randomAsHex(size);
}

export function toCredentialIRI(rootHash: string): string {
  if (rootHash.startsWith(KILT_CREDENTIAL_IRI_PREFIX)) {
    return rootHash;
  }
  if (!isHex(rootHash)) {
    throw new Error('Root hash is not a base16 / hex encoded string)');
  }
  return KILT_CREDENTIAL_IRI_PREFIX + rootHash;
}
