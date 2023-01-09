import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { LogType, env, ServiceName, Lmas } from '@apillon/lib';
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
    await new Lmas().writeLog({
      logType: LogType.INFO,
      // This is not an error!! getFullDidDocument is used to query document state
      message: `KILT => DID DOCUMENT DOES NOT EXIST`,
      location: 'AUTHENTICATION-API/attestation/attestation.service.ts',
      service: ServiceName.AUTHENTICATION_API,
    });

    return null;
  }

  return document;
}

export async function submitDidCreateTx(
  extrinsic: SubmittableExtrinsic,
): Promise<boolean> {
  await connect(env.KILT_NETWORK);

  const attesterAccount = (await generateAccount(
    env.KILT_ATTESTER_MNEMONIC,
  )) as KiltKeyringPair;

  try {
    await Blockchain.signAndSubmitTx(extrinsic, attesterAccount);
  } catch (error) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      message: `KILT => DID CREATION FAILED`,
      location: 'AUTHENTICATION-API/attestation/attestation.service.ts',
      service: ServiceName.AUTHENTICATION_API,
    });
    return false;
  }

  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `KILT => DID CREATION SUCCESSFULL`,
    location: 'AUTHENTICATION-API/attestation/attestation.service.ts',
    service: ServiceName.AUTHENTICATION_API,
  });

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
