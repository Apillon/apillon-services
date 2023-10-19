import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT}\`
    ADD COLUMN \`deployment_uuid\` VARCHAR(36) NULL;
    `);

  await queryFn(`
    update \`${DbTables.DEPLOYMENT}\`
    set deployment_uuid = uuid()
    where deployment_uuid is null;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.DEPLOYMENT}\` DROP COLUMN deployment_uuid;
    `);
}
