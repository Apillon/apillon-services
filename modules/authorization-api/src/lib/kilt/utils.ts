import { LogType, writeLog, env } from '@apillon/lib';
import {
  Blockchain,
  ConfigService,
  Did,
  DidDocument,
  //   ChainHelpers,
  //   Did,
  //   CType,
  //   Utils,
  KeyringPair,
  KiltKeyringPair,
  Utils,
  connect,
  ICType,
  CType,
  //   ConfigService,
  //   Blockchain,
  //   ICType,
  //   DidDocument,
  //   SignCallback,
} from '@kiltprotocol/sdk-js';
import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { Keypairs } from '../../config/types';

// export const resolveOn = ChainHelpers.Blockchain.IS_FINALIZED;
// export type KeyToolSignCallback = (didDocument: DidDocument) => SignCallback;

// export async function isCtypeOnChain(ctype: ICType): Promise<boolean> {
//   try {
//     await CType.verifyStored(ctype);
//     return true;
//   } catch {
//     return false;
//   }
// }

export async function generateMnemonic() {
  return mnemonicGenerate();
}

export async function generateAccount(mnemonic: string): Promise<KeyringPair> {
  return Utils.Crypto.makeKeypairFromSeed(
    mnemonicToMiniSecret(env.KILT_ATTESTER_MNEMONIC),
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

export function getCtypeSchema(): ICType {
  return CType.fromProperties('Authorization', {
    email: {
      type: 'string',
    },
    username: {
      type: 'string',
    },
  });
}

// export async function createFullDid(
//   account: KiltKeyringPair,
//   mnemonic: string
// ): Promise<DidDocument> {
//   const api = ConfigService.get('api');

//   const { authentication, encryption, assertion, delegation } = generateKeypairs(mnemonic);
//   // Get tx that will create the DID on chain and DID-URI that can be used to resolve the DID Document.

//   const didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));

//   if (didDoc && didDoc.document) {
//     return didDoc.document;
//   }

//   const fullDidCreationTx = await Did.getStoreTx(
//     {
//       authentication: [authentication],
//       keyAgreement: [encryption],
//       assertionMethod: [assertion],
//       capabilityDelegation: [delegation],
//     },
//     account.address,
//     async ({ data }) => ({
//       signature: authentication.sign(data),
//       keyType: authentication.type,
//     })
//   );

//   await Blockchain.signAndSubmitTx(fullDidCreationTx, account);

//   const didUri = Did.getFullDidUriFromKey(authentication);
//   const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
//   const { document } = Did.linkedInfoFromChain(encodedFullDid);

//   if (!document) {
//     throw 'Full DID was not successfully created.';
//   }

//   return document;
// }

// // TODO: Let's use existing CType structures - find on github of Kilt
// export function getCtypeSchema(): ICType {
//   return CType.fromProperties('Authorization', {
//     email: {
//       type: 'string',
//     },
//     username: {
//       type: 'string',
//     },
//   });
// }

// export function getChallenge(): string {
//   return Utils.UUID.generate();
// }
