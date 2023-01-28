import {
  blake2AsU8a,
  keyExtractPath,
  keyFromPath,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  naclBoxPairFromSecret,
  sr25519PairFromSeed,
} from '@polkadot/util-crypto';
import { LogType, env, ServiceName, Lmas } from '@apillon/lib';
import {
  ConfigService,
  Did,
  KeyringPair,
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
} from '@kiltprotocol/sdk-js';
import {
  Keypairs,
  KILT_DERIVATION_SIGN_ALGORITHM,
  EclipticDerivationPaths,
  ApillonSupportedCTypes,
} from '../config/types';
import { Keypair } from '@polkadot/util-crypto/types';
import { assert } from 'console';

export function generateMnemonic() {
  return mnemonicGenerate();
}

export async function generateAccount(mnemonic: string): Promise<KeyringPair> {
  return Utils.Crypto.makeKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
    KILT_DERIVATION_SIGN_ALGORITHM,
  );
}

export async function generateKeypairs(mnemonic: string) {
  // Derivations matter! Must use same algorithm as the one
  // stored on the chain
  const authentication = Utils.Crypto.makeKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
    { type: 'sr25519' },
  );
  const encryption = Utils.Crypto.makeEncryptionKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
  );

  const assertion = authentication.derive(EclipticDerivationPaths.ATTESTATION, {
    type: 'sr25519',
  }) as KiltKeyringPair;
  const delegation = authentication.derive(
    EclipticDerivationPaths.DELEGATION,
  ) as KiltKeyringPair;

  return {
    authentication,
    encryption,
    assertion,
    delegation,
  };
}

// This function basically creates a keyring from a mnemonic
export function generateAccountV2(mnemonic: string) {
  const signingKeyPairType = 'sr25519';
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  });
  return keyring.addFromMnemonic(mnemonic);
}

export async function generateKeypairsV2(mnemonic: string): Promise<Keypairs> {
  const account = generateAccountV2(mnemonic);
  // Authenticate presentations
  const authentication = {
    ...account.derive('//did//0'),
    type: 'sr25519',
  } as KiltKeyringPair;

  // Key used to attest transacations
  const assertion = {
    ...account.derive('//did//assertion//0'),
    type: 'sr25519',
  } as KiltKeyringPair;
  // Key used for authority delgation
  const delegation = {
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
    assertion: assertion,
    delegation: delegation,
  };
}

export async function getFullDidDocument(keypairs: Keypairs) {
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
) {
  const emailCType = getCtypeSchema(ApillonSupportedCTypes.EMAIL);
  const emailContents = {
    Email: email,
  };

  const authClaim = Claim.fromCTypeAndClaimContents(
    emailCType,
    emailContents,
    claimerDidUri,
  );

  const authCredential = Credential.fromClaim(authClaim);

  return {
    attestationInstance: Attestation.fromCredentialAndDid(
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
      const domainLinkage: ICType = {
        $id: 'kilt:ctype:0x9d271c790775ee831352291f01c5d04c7979713a5896dcf5e81708184cc5c643',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'Domain Linkage Credential',
        properties: {
          id: {
            type: 'string',
          },
          origin: {
            type: 'string',
          },
        },
        type: 'object',
      };

      return domainLinkage;
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
