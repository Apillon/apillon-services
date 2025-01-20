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
      [EvmChain.ARBITRUM_ONE]: TxToken.ARBITRUM_ONE_TOKEN,
      [EvmChain.ARBITRUM_ONE_SEPOLIA]: TxToken.ARBITRUM_ONE_SEPOLIA_TOKEN,
      [EvmChain.AVALANCHE]: TxToken.AVALANCHE_TOKEN,
      [EvmChain.AVALANCHE_FUJI]: TxToken.AVALANCHE_FUJI_TOKEN,
      [EvmChain.OPTIMISM]: TxToken.OPTIMISM_TOKEN,
      [EvmChain.OPTIMISM_SEPOLIA]: TxToken.OPTIMISM_SEPOLIA_TOKEN,
      [EvmChain.POLYGON]: TxToken.POLYGON_TOKEN,
      [EvmChain.POLYGON_AMOY]: TxToken.POLYGON_AMOY_TOKEN,
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
