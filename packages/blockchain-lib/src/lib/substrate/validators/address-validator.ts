import { SUBSTRATE_CHAIN_PREFIX_MAP, SubstrateChainPrefix } from '../types';
import { checkAddress } from '@polkadot/util-crypto';
import { isUndefined } from '@rawmodel/utils/dist/helpers/is-undefined';
import { isNull } from '@rawmodel/utils/dist/helpers/is-null';

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

/**
 * Checks if the provided list of addresses all conform to the Substrate chain
 * addresses format specific to the current chain context.
 *
 * @return A function that takes an array of addresses and returns
 * a boolean indicating whether all addresses are valid Substrate chain addresses
 * for the specified chain.
 */
export function isArrayOfSubstrateChainAddresses() {
  return function (this: any, addressList: string[]): boolean {
    const substrateChainPrefix = SUBSTRATE_CHAIN_PREFIX_MAP[this.chain];
    if (!substrateChainPrefix) {
      throw new Error(`Chain prefix not found for chain ${this.chain}.`);
    }
    return addressList.reduce(
      (acc, address) =>
        acc && substrateAddressValidator(substrateChainPrefix)(address),
      true,
    );
  };
}
