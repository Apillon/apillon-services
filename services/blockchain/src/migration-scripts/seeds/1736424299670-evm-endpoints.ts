import { ChainType, EvmChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

const chainsToInsert = [
  {
    url: 'https://mainnet.arbitrum.io',
    chain: EvmChain.ARBITRUM_ONE,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://sepolia.arbitrum.io',
    chain: EvmChain.ARBITRUM_ONE_SEPOLIA,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://rpc.avax.network',
    chain: EvmChain.AVALANCHE,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://rpc.fujiavax.network',
    chain: EvmChain.AVALANCHE_FUJI,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://mainnet.optimism.io',
    chain: EvmChain.OPTIMISM,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://sepolia.optimism.io',
    chain: EvmChain.OPTIMISM_SEPOLIA,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://rpc-mainnet.maticvigil.com',
    chain: EvmChain.POLYGON,
    chainType: ChainType.EVM,
  },
  {
    url: 'https://rpc-mumbai.maticvigil.com',
    chain: EvmChain.POLYGON_AMOY,
    chainType: ChainType.EVM,
  },
];

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  for (const { url, chain, chainType } of chainsToInsert) {
    await queryFn(
      `
        INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
        VALUES (5, ?, ?, ?);
      `,
      [url, chain, chainType],
    );
  }
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const chainIds = chainsToInsert.map(({ chain }) => chain).join(', ');
  await queryFn(`
    DELETE
    FROM \`${DbTables.ENDPOINT}\`
    WHERE chain IN (${chainIds});
  `);
}
