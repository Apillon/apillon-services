import { SubstrateChain } from '@apillon/lib';

export enum SubstrateChainPrefix {
  ASTAR = 5,
  PHALA = 30,
  HYDRATION = 63,
  UNIQUE = 7391,
}

export const SUBSTRATE_CHAIN_PREFIX_MAP = {
  [SubstrateChain.ASTAR]: SubstrateChainPrefix.ASTAR,
  [SubstrateChain.PHALA]: SubstrateChainPrefix.PHALA,
  [SubstrateChain.HYDRATION]: SubstrateChainPrefix.HYDRATION,
  [SubstrateChain.UNIQUE]: SubstrateChainPrefix.UNIQUE,
};
