import { ChainType } from '@apillon/lib';
import {
  substrateAddressValidator,
  SubstrateChainPrefix,
} from '../../../../substrate';
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
