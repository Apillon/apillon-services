import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEB_PAGE}\`
    ADD COLUMN \`webPage_uuid\` VARCHAR(36) NULL;
    `);

  await queryFn(`
    update \`${DbTables.WEB_PAGE}\`
    set webPage_uuid = uuid()
    where webPage_uuid is null;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.WEB_PAGE}\` DROP COLUMN webPage_uuid;
    `);
}
