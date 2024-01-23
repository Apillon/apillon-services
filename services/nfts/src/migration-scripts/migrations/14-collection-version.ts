import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    ADD COLUMN \`isAutoIncrement\` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN \`contractVersion\` INT NOT NULL DEFAULT 1;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    DROP COLUMN \`isAutoIncrement\`,
    DROP COLUMN \`contractVersion\`;
  `);
}
