import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_QUEUE}\`
    ADD COLUMN \`project_uuid\` VARCHAR(36) NULL;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    ADD COLUMN \`project_uuid\` VARCHAR(36) NULL;
`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_QUEUE}\`
    DROP COLUMN \`project_uuid\`;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    DROP COLUMN \`project_uuid\`;
  `);
}
