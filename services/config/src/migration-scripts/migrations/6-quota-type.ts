import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.QUOTA}\`
    ADD COLUMN \`type\` INT NULL,
    DROP COLUMN \`service_type_id\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.QUOTA}\`
    DROP COLUMN \`type\`,
    ADD COLUMN \`service_type_id\` INT NULL;
  `);
}
