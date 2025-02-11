import { Lmas } from '../../..';
import {
  ChainType,
  EvmChain,
  LogType,
  ServiceName,
  SubstrateChain,
} from '../../../config/types';
import axios from 'axios';

export type Chain = SubstrateChain | EvmChain;

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
    ACU: 'acurast',
    UNQ: 'unq',
    HDX: 'hydradx',
  };
  const networkName = networkTokenMap[token];
  try {
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${networkName}&vs_currencies=USD`,
    );
    console.info(
      `Retrieved response from coingecko API: ${JSON.stringify(data)}`,
    );
    return data?.[networkName]?.usd;
  } catch (err) {
    console.error(
      `Failed to retrieve price for token ${token} from coingecko:`,
      err,
    );
    return 0;
  }
}

export async function getEvmTokenPrices(): Promise<Record<string, number>> {
  const tokenSymbolMap = {
    ethereum: 'ETH',
    binancecoin: 'BNB',
    'matic-network': 'MATIC',
    'avalanche-2': 'AVAX',
    optimism: 'OP',
    arbitrum: 'ARB',
    celo: 'CELO',
  };

  try {
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${Object.keys(
        tokenSymbolMap,
      ).join(',')}&vs_currencies=USD`,
    );

    console.info(
      `Retrieved response from coingecko for top EVM tokens: ${JSON.stringify(
        data,
      )}`,
    );

    // Return mapping of token symbol to price in USD
    return Object.keys(data).reduce((acc, network) => {
      acc[tokenSymbolMap[network]] = data[network].usd;
      if (tokenSymbolMap[network] === 'MATIC') {
        // Also handle token rebranding from MATIC to POL
        acc['POL'] = data[network].usd;
      }
      return acc;
    }, {});
  } catch (err) {
    console.error(
      `Failed to retrieve prices for top EVM tokens from coingecko: ${err}`,
    );
    await new Lmas().sendAdminAlert(
      `[CoinGecko API]: Error retrieving top EVM token prices! ${err}`,
      ServiceName.APILLON_API,
      LogType.ALERT,
    );
    return {};
  }
}
