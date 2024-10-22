import { checkAddress } from '@polkadot/util-crypto';
import { SubstrateChainPrefix } from '../types';

export function signersGreaterOrEqualThreshold(
  chainPrefix: SubstrateChainPrefix,
  offset = 0,
) {
  return function (this: unknown, signers: unknown): boolean {
    if (
      typeof this !== 'object' ||
      !('threshold' in this) ||
      typeof this.threshold !== 'number'
    ) {
      return false;
    }

    if (!signers || !Array.isArray(signers)) {
      return false;
    }

    // ensure array of wallet addresses
    if (
      !signers.reduce((acc, signer) => {
        if (!acc || typeof signer !== 'string') {
          return false;
        }
        const [isValid] = checkAddress(signer, chainPrefix);
        return isValid;
      }, true)
    ) {
      return false;
    }

    return signers.length + offset >= this.threshold;
  };
}
