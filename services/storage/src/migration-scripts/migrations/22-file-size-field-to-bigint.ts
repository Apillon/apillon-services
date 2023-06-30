import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.FILE}\`
    MODIFY \`size\` BIGINT NOT NULL;
    `);
}

export async function downgrade(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  return;
}
