import { LogType, writeLog, env } from '@apillon/lib';
import {
  Blockchain,
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
  SubmittableExtrinsic,
  DidUri,
} from '@kiltprotocol/sdk-js';
import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { Keypairs } from '../../config/types';

export async function generateMnemonic() {
  return mnemonicGenerate();
}

export async function generateAccount(mnemonic: string): Promise<KeyringPair> {
  return Utils.Crypto.makeKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
    'sr25519',
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

export async function getFullDidDocument(keypairs: Keypairs) {
  const api = ConfigService.get('api');
  const didUri = Did.getFullDidUriFromKey(keypairs.authentication);
  const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
  const { document } = Did.linkedInfoFromChain(encodedFullDid);

  if (!document) {
    console.error('Full DID was not successfully created.');
  }

  return document;
}

export async function submitDidCreateTx(
  extrinsic: SubmittableExtrinsic,
): Promise<boolean> {
  // TODO: Will probably be expanded in the future with a dedicated module
  // with getters and setters for specifics about did creation ....
  console.log('Connecting to Kilt network ...');
  await connect(env.KILT_NETWORK);

  const attesterAccount = (await generateAccount(
    env.KILT_ATTESTER_MNEMONIC,
  )) as KiltKeyringPair;

  try {
    await Blockchain.signAndSubmitTx(extrinsic, attesterAccount);
  } catch (error) {
    console.log(error);
    writeLog(
      LogType.ERROR,
      `KILT :: DID CREATION FAILED`,
      'attestation.service.ts',
      'submitDidCreateTx',
    );
    return false;
  }

  writeLog(
    LogType.MSG,
    `KILT TX :: DID CREATION SUCCESSFULL`,
    'attestation.service.ts',
    'submitDidCreateTx',
  );

  return true;
}

export function prepareAttestation(
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
    attestObject: Attestation.fromCredentialAndDid(
      authCredential,
      attesterDidUri,
    ),
    credential: authCredential,
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

export async function getNextNonce(didUri: DidUri) {
  const api = ConfigService.get('api');
  const queried = await api.query.did.did(Did.toChain(didUri));
  const currentNonce = parseInt(
    Did.documentFromChain(queried).lastTxCounter.toString(),
  );
  return currentNonce + 1;
}
