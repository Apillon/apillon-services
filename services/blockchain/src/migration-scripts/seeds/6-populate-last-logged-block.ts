import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // Note: Polkadot RPC URL is modified to a private one in the database
  await queryFn(`
    UPDATE ${DbTables.WALLET}
    SET lastLoggedBlock = lastParsedBlock;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE ${DbTables.WALLET}
    SET lastLoggedBlock = null;
  `);
}
