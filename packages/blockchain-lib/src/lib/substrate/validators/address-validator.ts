import { SubstrateChainPrefix } from '../types';
import { checkAddress } from '@polkadot/util-crypto';
import { isNull, isUndefined } from '@rawmodel/utils';

export function substrateAddressValidator(
  chainPrefix: SubstrateChainPrefix,
  allowEmpty = true,
) {
  return function (this: any, address: string): boolean {
    if (allowEmpty && (isUndefined(address) || isNull(address))) {
      return true;
    }
    try {
      const [isValid] = checkAddress(address, chainPrefix);

      return isValid;
    } catch (e: any) {
      return false;
    }
  };
}
