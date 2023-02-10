import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.FILE_UPLOAD_REQUEST}\`
    MODIFY \`contentType\` VARCHAR(100) NULL;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    MODIFY \`contentType\` VARCHAR(100) NULL;
    `);
}

export async function downgrade(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  return;
}
