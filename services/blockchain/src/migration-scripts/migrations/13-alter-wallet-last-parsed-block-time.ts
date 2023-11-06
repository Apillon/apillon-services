import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\`
    ADD COLUMN \`lastParsedBlockUpdateTime\` DATETIME NULL AFTER \`lastParsedBlock\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\`
    DROP COLUMN \`lastParsedBlockUpdateTime\`;
  `);
}
