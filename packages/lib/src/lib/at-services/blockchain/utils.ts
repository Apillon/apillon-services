import { formatUnits } from 'ethers/lib/utils';
import { ethers } from 'ethers';
import { ChainType, EvmChain, SubstrateChain } from '../../../config/types';
import axios from 'axios';

export type Chain = SubstrateChain | EvmChain;

export function formatTokenWithDecimals(
  amount: string, // string rep of big number
  chainType: ChainType,
  chain: Chain,
): string {
  return formatUnits(
    ethers.BigNumber.from(amount),
    getTokenDecimalsFromChain(chainType, chain),
  );
}

export function formatWalletAddress(
  chainType: ChainType,
  chain: Chain,
  walletAddress: string,
) {
  return `${
    chainType === ChainType.EVM ? EvmChain[chain] : SubstrateChain[chain]
  }: ${walletAddress}`;
}

function getTokenDecimalsFromChain(chainType: ChainType, chain: Chain) {
  const options = {
    [ChainType.EVM]: {
      [EvmChain.MOONBEAM]: 18,
      [EvmChain.MOONBASE]: 18,
      [EvmChain.ASTAR]: 18,
      [EvmChain.ASTAR_SHIBUYA]: 18,
    },
    [ChainType.SUBSTRATE]: {
      [SubstrateChain.CRUST]: 12,
      [SubstrateChain.KILT]: 15,
      [SubstrateChain.PHALA]: 18,
    },
  };
  return options[chainType]?.[chain] || null;
}

export async function getTokenPriceUsd(token: string) {
  const networkTokenMap = {
    CRU: 'crust-network',
    ASTR: 'astar',
    KILT: 'kilt-protocol',
    PHA: 'pha',
    GLMR: 'moonbeam',
    DEV: 'moonbase',
  };
  const networkName = networkTokenMap[token];
  try {
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${networkName}&vs_currencies=USD`,
    );
    return data?.[networkName]?.usd;
  } catch (err) {
    return 0;
  }
}
