import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
    VALUES (5, 'https://rpc.ankr.com/celo	', ${EvmChain.CELO}, ${ChainType.EVM}),
           (5, 'https://alfajores-forno.celo-testnet.org	', ${EvmChain.ALFAJORES}, ${ChainType.EVM});
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.ENDPOINT}\`
    WHERE chain IN (${EvmChain.CELO}, ${EvmChain.ALFAJORES});
  `);
}
