import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEBSITE}\`
      ADD COLUMN \`isSimplet\` BOOLEAN NOT NULL DEFAULT false AFTER \`source\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEBSITE}\`
      DROP COLUMN \`isSimplet\`;`);
}
