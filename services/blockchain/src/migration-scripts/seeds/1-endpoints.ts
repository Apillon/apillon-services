import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
    VALUES
    (5, 'wss://rpc.crust.network', ${SubstrateChain.CRUST}, ${ChainType.SUBSTRATE}),
    (5, 'wss://spiritnet.kilt.io', ${SubstrateChain.KILT}, ${ChainType.SUBSTRATE})
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM \`${DbTables.ENDPOINT}\`;
  `);
}
