import { ChainType, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
        VALUES (5, 'wss://websocket-proxy-1.prod.gke.acurast.com', ${SubstrateChain.ACURAST},
                ${ChainType.SUBSTRATE})
        ;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        DELETE
        FROM \`${DbTables.ENDPOINT}\`
        WHERE chain IN (${SubstrateChain.ACURAST});
    `);
}
