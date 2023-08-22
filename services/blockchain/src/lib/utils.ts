import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import type { Wallet } from '../modules/wallet/wallet.model';
import { Chain, TxToken } from '../config/types';
import axios from 'axios';

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

export function getTokenDecimalsFromChain(chainType: ChainType, chain: Chain) {
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

export function formatWalletAddress(wallet: Wallet) {
  return `${
    wallet.chainType === ChainType.EVM
      ? EvmChain[wallet.chain]
      : SubstrateChain[wallet.chain]
  }: ${wallet.address}`;
}

export async function getTokenPriceEur(token: string) {
  const networkTokenMap = {
    CRU: 'crust-network',
    ASTR: 'astar',
    KILT: 'kilt-protocol',
    GLMR: 'moonbeam',
  };
  const networkName = networkTokenMap[token];
  const { data } = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price/?ids=${networkName}&vs_currencies=EUR`,
  );
  return data?.[networkName]?.eur;
}
