import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE INDEX \`idx_search_by_file_key\`  ON \`${DbTables.FILE_UPLOAD_REQUEST}\`
    (s3FileKey, status) COMMENT '' ALGORITHM DEFAULT LOCK NONE;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP INDEX \`idx_search_by_file_key\`;
  `);
}
