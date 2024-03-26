import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\`
    ADD COLUMN \`minTxBalance\` DECIMAL(40,0) NULL AFTER \`minBalance\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\` DROP COLUMN \`minTxBalance\`;
  `);
}
