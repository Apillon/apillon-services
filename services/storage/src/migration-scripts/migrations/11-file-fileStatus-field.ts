import { DbTables, FileStatus } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    ADD COLUMN \`fileStatus\` INT NOT NULL DEFAULT ${FileStatus.PINNED_TO_CRUST};
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.FILE}\` DROP COLUMN fileStatus;
    `);
}
