import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.PRODUCT}\`
    ADD COLUMN \`service\` VARCHAR(60) NULL AFTER \`description\`,
    ADD COLUMN \`category\` VARCHAR(60) NULL AFTER \`service\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.PRODUCT}\`
    DROP COLUMN \`service\`,
    DROP COLUMN \`category\`;
  `);
}
