import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE ${DbTables.WALLET} AS w
      LEFT JOIN (
      SELECT tl.wallet, tl.chain, tl.chainType, MAX (tl.blockId) AS maxBlockId
      FROM ${DbTables.TRANSACTION_LOG} AS tl
      GROUP BY tl.wallet, tl.chain, tl.chainType
      ) AS maxTl
    ON w.chain = maxTl.chain AND w.chainType = maxTl.chainType AND w.address = maxTl.wallet
      SET w.lastLoggedBlock = IFNULL(maxTl.maxBlockId, w.lastParsedBlock)
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
