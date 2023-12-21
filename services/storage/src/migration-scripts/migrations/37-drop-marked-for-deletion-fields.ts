import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.BUCKET}\` DROP COLUMN markedForDeletionTime;
    `);

  await queryFn(`
        ALTER TABLE \`${DbTables.DIRECTORY}\` DROP COLUMN markedForDeletionTime;
    `);

  await queryFn(`
        ALTER TABLE \`${DbTables.FILE}\` DROP COLUMN markedForDeletionTime;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.BUCKET}\`
    ADD COLUMN \`markedForDeletionTime\` DATETIME NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.DIRECTORY}\`
    ADD COLUMN \`markedForDeletionTime\` DATETIME NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    ADD COLUMN \`markedForDeletionTime\` DATETIME NULL;
    `);
}
