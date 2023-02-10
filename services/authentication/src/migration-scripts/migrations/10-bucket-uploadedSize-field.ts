import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.BUCKET}\`
    ADD COLUMN \`uploadedSize\` BIGINT NULL;
    `);

  await queryFn(`
    UPDATE \`${DbTables.BUCKET}\`
    SET \`uploadedSize\` = IFNULL(\`size\`,0);
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.BUCKET}\` DROP COLUMN uploadedSize;
    `);
}
