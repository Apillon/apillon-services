import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.BUCKET}\`
    ADD COLUMN \`CIDv1\` VARCHAR(255) NULL;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.DIRECTORY}\`
    ADD COLUMN \`CIDv1\` VARCHAR(255) NULL;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT}\`
    ADD COLUMN \`cidv1\` VARCHAR(255) NULL;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    ADD COLUMN \`CIDv1\` VARCHAR(255) NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.BUCKET}\` DROP COLUMN CIDv1;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.DIRECTORY}\` DROP COLUMN CIDv1;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT}\` DROP COLUMN cidv1;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\` DROP COLUMN CIDv1;
  `);
}
