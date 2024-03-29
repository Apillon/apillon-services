import { SubstrateChainPrefix } from '../../substrate/constants/substrate-chain-prefix';
import { ChainType } from '../../../../config/types';
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
  chainTypeKey = 'chainType',
) {
  return function (this: any, address: string): boolean {
    return isEvmOrSubstrateWalletAddress(
      address,
      this[chainTypeKey],
      substrateChainPrefix,
      allowNull,
    );
  };
}
