import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.IPNS}\`
    ADD COLUMN \`ipns_uuid\` VARCHAR(36) NULL;
    `);

  await queryFn(`
    update \`${DbTables.IPNS}\`
    set ipns_uuid = uuid()
    where ipns_uuid is null;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.IPNS}\` DROP COLUMN \`ipns_uuid\`;
    `);
}
