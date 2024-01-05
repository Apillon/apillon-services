import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // Note: Polkadot RPC URL is modified to a private one in the database
  await queryFn(`
    UPDATE ${DbTables.WALLET} AS w
    SET w.lastLoggedBlock = (SELECT MAX(tl.blockId)
                             FROM ${DbTables.TRANSACTION_LOG} AS tl
                             WHERE w.chain = tl.chain
                               AND w.chainType = tl.chainType
                               AND w.address = tl.wallet)
    WHERE 1;
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
