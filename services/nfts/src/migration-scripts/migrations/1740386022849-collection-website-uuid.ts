import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE ${DbTables.COLLECTION} ADD COLUMN \`websiteUuid\` VARCHAR(36) NULL;  
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE ${DbTables.COLLECTION} DROP COLUMN \`websiteUuid\`;
  `);
}
