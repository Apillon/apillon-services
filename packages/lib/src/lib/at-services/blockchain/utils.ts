import { formatUnits } from 'ethers/lib/utils';
import { ethers } from 'ethers';
import { ChainType, EvmChain, SubstrateChain } from '../../../config/types';
import axios from 'axios';

export type Chain = SubstrateChain | EvmChain;

export function formatTokenWithDecimals(
  amount: string, // string rep of big number
  decimals: number,
): string {
  return formatUnits(ethers.BigNumber.from(amount), decimals);
}

export function formatWalletAddress(
  chainType: ChainType,
  chain: Chain,
  walletAddress: string,
) {
  return `${getChainName(chainType, chain)}: ${walletAddress}`;
}

export function getChainName(chainType: ChainType, chain: Chain) {
  return chainType === ChainType.EVM ? EvmChain[chain] : SubstrateChain[chain];
}

export async function getTokenPriceUsd(token: string): Promise<number> {
  const networkTokenMap = {
    CRU: 'crust-network',
    ASTR: 'astar',
    KILT: 'kilt-protocol',
    PHA: 'pha',
    GLMR: 'moonbeam',
    DEV: 'moonbase',
    SUB: 'subsocial',
  };
  const networkName = networkTokenMap[token];
  try {
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${networkName}&vs_currencies=USD`,
    );
    console.log('Retrieved response from coingecko', data);
    return data?.[networkName]?.usd;
  } catch (err) {
    console.error(
      `Failed to retrieve price for token ${token} from coingecko:`,
      err,
    );
    return 0;
  }
}
