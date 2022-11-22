import { LogType, writeLog, env } from '@apillon/lib';
import {
  Blockchain,
  ConfigService,
  Did,
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
  Utils,
  connect,
  ICType,
  CType,
  Claim,
  Attestation,
  Credential,
} from '@kiltprotocol/sdk-js';
import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { Keypairs } from '../../config/types';

export async function generateMnemonic() {
  return mnemonicGenerate();
}

export async function extractAccFromMnemonic(
  mnemonic: string,
): Promise<KeyringPair> {
  return Utils.Crypto.makeKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
    'sr25519',
  );
}

export function generateKeypairs(mnemonic: string) {
  // TODO: Derivations matter! Must use same algorithm as the one
  // stored on the chain
  const authentication = Utils.Crypto.makeKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
    'sr25519',
  );
  const encryption = Utils.Crypto.makeEncryptionKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
  );

  const assertion = authentication.derive('//attestation', {
    type: 'sr25519',
  }) as KiltKeyringPair;
  const delegation = authentication.derive('//delegation') as KiltKeyringPair;

  return {
    authentication,
    encryption,
    assertion,
    delegation,
  };
}

export async function getOrCreateFullDid(
  account: KiltKeyringPair,
  keypairs: Keypairs,
): Promise<DidDocument> {
  // TODO: Will probably be expanded in the future with a dedicated module
  // with getters and setters for specifics about did creation ....
  console.log('Connecting to Kilt network ...');
  await connect(env.KILT_NETWORK);
  const api = ConfigService.get('api');
  const { authentication, encryption, assertion, delegation } = keypairs;
  const didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));

  if (didDoc && didDoc.document) {
    return didDoc.document;
  }

  // TODO: Each operation in BC should also trigger a notification about:
  // caller, balance, etc etc
  const fullDidCreationTx = await Did.getStoreTx(
    {
      authentication: [authentication],
      keyAgreement: [encryption],
      assertionMethod: [assertion],
      capabilityDelegation: [delegation],
    },
    account.address,
    async ({ data }) => ({
      signature: authentication.sign(data),
      keyType: authentication.type,
    }),
  );

  // TODO: Add params, modifiy, change log structure etc etc
  writeLog(
    LogType.MSG,
    `KILT TX CREATE ==> FULL_DID_CREATION`,
    'attestation.service.ts',
    'sendVerificationEmail',
  );

  console.log('Submitting DID creation tx ...');
  await Blockchain.signAndSubmitTx(fullDidCreationTx, account);

  const didUri = Did.getFullDidUriFromKey(authentication);
  const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
  const { document } = Did.linkedInfoFromChain(encodedFullDid);

  if (!document) {
    throw 'Full DID was not successfully created.';
  }

  return document;
}

export function setupCredsProposition(
  // TODO: Change to correct types
  email: string,
  attesterDidUri: any,
  claimerDidUri: any,
) {
  const authCType = getCtypeSchema();
  const authContents = {
    Email: email,
  };

  const authClaim = Claim.fromCTypeAndClaimContents(
    authCType,
    authContents,
    claimerDidUri,
  );

  const authCredential = Credential.fromClaim(authClaim);
  return {
    creds: authCredential,
    credsProposition: Attestation.fromCredentialAndDid(
      authCredential,
      attesterDidUri,
    ),
  };
}

export function getCtypeSchema(): ICType {
  // TODO: These are the official CTypes create by Kilt
  return CType.fromProperties('Email', {
    Email: {
      type: 'string',
    },
  });
}
