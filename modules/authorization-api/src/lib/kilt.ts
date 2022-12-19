import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
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
import {
  Keypairs,
  KILT_DERIVATION_SIGN_ALGORITHM,
  EclipticDerivationPaths,
} from '../config/types';

export async function generateMnemonic() {
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
    KILT_DERIVATION_SIGN_ALGORITHM,
  );
  const encryption = Utils.Crypto.makeEncryptionKeypairFromSeed(
    mnemonicToMiniSecret(mnemonic),
  );

  const assertion = authentication.derive(EclipticDerivationPaths.ATTESTATION, {
    type: KILT_DERIVATION_SIGN_ALGORITHM,
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
    console.error('Full DID was not successfully created.');
  }

  return document;
}

export async function submitDidCreateTx(
  extrinsic: SubmittableExtrinsic,
): Promise<boolean> {
  console.log('Connecting to Kilt network ...');
  await connect(env.KILT_NETWORK);

  const attesterAccount = (await generateAccount(
    env.KILT_ATTESTER_MNEMONIC,
  )) as KiltKeyringPair;

  try {
    await Blockchain.signAndSubmitTx(extrinsic, attesterAccount);
  } catch (error) {
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

export function createAttestationRequest(
  email: string,
  attesterDidUri: DidUri,
  claimerDidUri: DidUri,
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
    attestationInstance: Attestation.fromCredentialAndDid(
      authCredential,
      attesterDidUri,
    ),
    credential: authCredential,
  };
}

export function getCtypeSchema(): ICType {
  // NOTE: These are official CTypes created by Kilt
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
