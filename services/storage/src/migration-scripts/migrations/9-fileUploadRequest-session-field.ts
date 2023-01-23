import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.FILE_UPLOAD_REQUEST}\`
    MODIFY \`session_id\` INT NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  //   await queryFn(`
  //     ALTER TABLE \`${DbTables.FILE_UPLOAD_REQUEST}\`
  //     ALTER COLUMN \`session_id\` INT NOT NULL;
  //     `);
}
