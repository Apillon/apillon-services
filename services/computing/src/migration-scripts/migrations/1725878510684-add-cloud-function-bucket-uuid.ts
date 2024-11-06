import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.CLOUD_FUNCTION}\`
    ADD COLUMN \`bucket_uuid\` VARCHAR(36) NOT NULL AFTER \`project_uuid\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.CLOUD_FUNCTION}\`
    DROP COLUMN \`bucket_uuid\`;
  `);
}
