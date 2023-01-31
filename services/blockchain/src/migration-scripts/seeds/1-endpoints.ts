import { Chain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ENDPOINT} (status, url, chain)
    VALUES 
    (5, 'wss://rpc.crust.network', ${Chain.CRUST}),
    (5, 'wss://spiritnet.kilt.io', ${Chain.KILT})
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
