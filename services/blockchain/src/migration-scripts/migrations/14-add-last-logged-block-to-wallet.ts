import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\`
    ADD COLUMN \`lastLoggedBlock\` INT NULL AFTER \`lastParsedBlockUpdateTime\`,
    ADD COLUMN \`lastLoggedBlockUpdateTime\` DATETIME NULL AFTER \`lastLoggedBlock\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\`
    DROP COLUMN \`lastLoggedBlock\`,
    DROP COLUMN \`lastLoggedBlockUpdateTime\`;
  `);
}
