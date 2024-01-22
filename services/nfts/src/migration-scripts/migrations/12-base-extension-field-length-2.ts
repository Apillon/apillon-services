import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    MODIFY COLUMN \`baseExtension\` VARCHAR(2000) NOT NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    MODIFY COLUMN \`baseExtension\` VARCHAR(255) NOT NULL;
    `);
}
