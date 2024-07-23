import { ChainType } from '../../../../config/types';
import {
  substrateAddressValidator,
  SubstrateChainPrefix,
} from '@apillon/blockchain-lib/substrate';
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
