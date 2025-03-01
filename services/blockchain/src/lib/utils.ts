import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { Chain, TxToken } from '../config/types';

export function getTokenFromChain(chainType: ChainType, chain: Chain) {
  const options = {
    [ChainType.EVM]: {
      [EvmChain.MOONBEAM]: TxToken.MOONBEAM_TOKEN,
      [EvmChain.MOONBASE]: TxToken.MOONBASE_TOKEN,
      [EvmChain.ASTAR]: TxToken.ASTAR_TOKEN,
      [EvmChain.ASTAR_SHIBUYA]: TxToken.SHIBUYA_TOKEN,
      [EvmChain.BASE]: TxToken.BASE_TOKEN,
      [EvmChain.BASE_SEPOLIA]: TxToken.BASE_SEPOLIA_TOKEN,
    },
    [ChainType.SUBSTRATE]: {
      [SubstrateChain.CRUST]: TxToken.CRUST_TOKEN,
      [SubstrateChain.KILT]: TxToken.KILT_TOKEN,
      [SubstrateChain.PHALA]: TxToken.PHALA_TOKEN,
      [SubstrateChain.SUBSOCIAL]: TxToken.SUBSOCIAL_TOKEN,
    },
  };
  return options[chainType]?.[chain] || null;
}
