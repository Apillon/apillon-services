import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { Chain, TxToken } from '../config/types';

export function getTokenFromChain(chainType: ChainType, chain: Chain) {
  const options = {
    [ChainType.EVM]: {
      [EvmChain.MOONBEAM]: TxToken.MOONBEAM_TOKEN,
      [EvmChain.MOONBASE]: TxToken.MOONBASE_TOKEN,
      [EvmChain.ASTAR]: TxToken.ASTAR_TOKEN,
      [EvmChain.ASTAR_SHIBUYA]: TxToken.SHIBUYA_TOKEN,
    },
    [ChainType.SUBSTRATE]: {
      [SubstrateChain.CRUST]: TxToken.CRUST_TOKEN,
      [SubstrateChain.KILT]: TxToken.KILT_TOKEN,
      [SubstrateChain.PHALA]: TxToken.PHALA_TOKEN,
    },
  };
  return options[chainType]?.[chain] || null;
}
