import { EvmChain, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // Add new minTxBalance (for tx send check) and update existing minBalance (for alerting)
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minTxBalance = 2000000000000000, minBalance = 16000000000000000 WHERE chain = ${SubstrateChain.KILT}`,
  );
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minTxBalance = 1000000000000 WHERE chain = ${SubstrateChain.PHALA}`,
  );
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minBalance = 15000000000000000000 WHERE chain = ${EvmChain.MOONBEAM}`,
  );
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minBalance = 15000000000000000000 WHERE chain = ${EvmChain.ASTAR}`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE \`${DbTables.WALLET}\` SET minTxBalance = NULL;
  `);
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minBalance = 10000000000000000 WHERE chain = ${SubstrateChain.KILT}`,
  );
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minBalance = 10000000000000000000 WHERE chain = ${EvmChain.MOONBEAM}`,
  );
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minBalance = 10000000000000000000 WHERE chain = ${EvmChain.ASTAR}`,
  );
}
