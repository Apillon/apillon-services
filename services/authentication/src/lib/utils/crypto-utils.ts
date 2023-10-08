import { Utils } from '@kiltprotocol/sdk-js';
import { hexToU8a } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

export async function decryptAssymetric(
  payload: any,
  publicKey: string,
  privateKey: string,
) {
  let decrypted = null;
  try {
    // Decrypt incoming payload -> DID creation TX generated on FE
    decrypted = Utils.Crypto.decryptAsymmetricAsStr(
      {
        box: hexToU8a(payload.message),
        nonce: hexToU8a(payload.nonce),
      },
      publicKey,
      privateKey,
    );
  } catch (error) {
    console.error(error);
  } finally {
    return decrypted;
  }
}

export function randomChallenge(size = 16) {
  return randomAsHex(size);
}
