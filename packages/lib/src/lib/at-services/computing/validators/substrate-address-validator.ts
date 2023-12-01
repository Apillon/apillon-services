import { ChainPrefix } from '../../substrate/constants/chain-prefix';
import { checkAddress } from '@polkadot/util-crypto';

export function substrateAddressValidator(chainPrefix: ChainPrefix) {
  return function (this: any, address: string): boolean {
    try {
      const [isValid] = checkAddress(address, chainPrefix);

      return isValid;
    } catch (e: any) {
      return false;
    }
  };
}
