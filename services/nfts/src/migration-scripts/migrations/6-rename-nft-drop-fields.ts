import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      RENAME COLUMN \`isDrop\` TO \`drop\`;
    `);
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      RENAME COLUMN \`mintPrice\` TO \`dropPrice\`;
  `);
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      RENAME COLUMN \`reserve\` TO \`dropReserve\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      RENAME COLUMN \`drop\` TO \`isDrop\`;
    `);
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      RENAME COLUMN \`dropPrice\` TO \`mintPrice\`;
  `);
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      RENAME COLUMN \`dropReserve\` TO \`reserve\`;
  `);
}
