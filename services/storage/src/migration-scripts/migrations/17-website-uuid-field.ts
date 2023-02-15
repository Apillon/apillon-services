import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEBSITE}\`
    ADD COLUMN \`website_uuid\` VARCHAR(36) NULL;
    `);

  await queryFn(`
    update \`${DbTables.WEBSITE}\`
    set website_uuid = uuid()
    where website_uuid is null;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.WEBSITE}\` DROP COLUMN website_uuid;
    `);
}
