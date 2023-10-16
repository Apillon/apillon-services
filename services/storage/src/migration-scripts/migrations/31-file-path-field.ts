import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    ADD COLUMN \`path\` VARCHAR(1000) NULL AFTER directory_id;
    `);

  await queryFn(`
    UPDATE \`${DbTables.FILE}\` f 
    JOIN \`${DbTables.FILE_UPLOAD_REQUEST}\` fur ON fur.file_uuid = f.file_uuid
    SET f.path = fur.path
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\` DROP COLUMN \`path\`;
  `);
}
