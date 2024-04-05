import { SubstrateChainPrefix } from '../../substrate/types';
import { ChainType, EvmChain } from '../../../../config/types';
import { substrateAddressValidator } from '../../substrate/validators/address-validator';
import { ethAddressValidator } from '@rawmodel/validators';

export function isEvmOrSubstrateWalletAddress(
  address: string,
  chainType: ChainType,
  substrateChainPrefix: SubstrateChainPrefix,
  allowNull = false,
) {
  if (allowNull && !address) {
    return true;
  }
  if (chainType === ChainType.SUBSTRATE) {
    return substrateAddressValidator(substrateChainPrefix)(address);
  } else {
    return ethAddressValidator()(address);
  }
}

export function evmOrSubstrateWalletValidator(
  substrateChainPrefix: SubstrateChainPrefix,
  allowNull = false,
) {
  return function (this: any, address: string): boolean {
    const chainType = Object.values(EvmChain).includes(this.chain)
      ? ChainType.EVM
      : ChainType.SUBSTRATE;
    return isEvmOrSubstrateWalletAddress(
      address,
      chainType,
      substrateChainPrefix,
      allowNull,
    );
  };
}
