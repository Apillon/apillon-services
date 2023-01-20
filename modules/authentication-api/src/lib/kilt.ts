import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
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
} from '@kiltprotocol/sdk-js';
import {
  Keypairs,
  KILT_DERIVATION_SIGN_ALGORITHM,
  EclipticDerivationPaths,
  ApillonSupportedCTypes,
} from '../config/types';
import { Key } from 'readline';

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
    'sr25519',
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

export async function revokeDidDocument(
  keypairs: Keypairs,
  didUri: DidUri,
): Promise<boolean> {
  await connect(env.KILT_NETWORK);
  const api = ConfigService.get('api');
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

    return false;
  }

  return true;
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
