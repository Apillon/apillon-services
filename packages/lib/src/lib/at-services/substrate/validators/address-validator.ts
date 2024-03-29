import { SubstrateChainPrefix } from '../constants/substrate-chain-prefix';
import { checkAddress } from '@polkadot/util-crypto';

export function substrateAddressValidator(chainPrefix: SubstrateChainPrefix) {
  return function (this: any, address: string): boolean {
    try {
      const [isValid] = checkAddress(address, chainPrefix);

      return isValid;
    } catch (e: any) {
      return false;
    }
  };
}
