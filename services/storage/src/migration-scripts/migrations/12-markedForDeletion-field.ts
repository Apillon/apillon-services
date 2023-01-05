import { DbTables, FileStatus } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.BUCKET}\`
    ADD COLUMN \`markedForDeletion\` DATETIME NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.DIRECTORY}\`
    ADD COLUMN \`markedForDeletion\` DATETIME NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    ADD COLUMN \`markedForDeletion\` DATETIME NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.BUCKET}\` DROP COLUMN markedForDeletion;
    `);

  await queryFn(`
        ALTER TABLE \`${DbTables.DIRECTORY}\` DROP COLUMN markedForDeletion;
    `);

  await queryFn(`
        ALTER TABLE \`${DbTables.FILE}\` DROP COLUMN markedForDeletion;
    `);
}
