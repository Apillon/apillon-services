import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    ADD COLUMN \`imagesSession\` VARCHAR(36) NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    ADD COLUMN \`metadataSession\` VARCHAR(36) NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    MODIFY \`baseUri\` VARCHAR(500) NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.COLLECTION}\` DROP COLUMN imagesSession;
    `);
  await queryFn(`
        ALTER TABLE \`${DbTables.COLLECTION}\` DROP COLUMN metadataSession;
    `);
}
