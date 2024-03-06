import { ChainType, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minTxBalance = 2000000000000000 WHERE chain = ${SubstrateChain.KILT}`,
  );
  await queryFn(
    `UPDATE ${DbTables.WALLET} SET minTxBalance = 1000000000000 WHERE chain = ${SubstrateChain.PHALA}`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        UPDATE \`${DbTables.WALLET}\` SET minTxBalance = NULL;
    `);
}
