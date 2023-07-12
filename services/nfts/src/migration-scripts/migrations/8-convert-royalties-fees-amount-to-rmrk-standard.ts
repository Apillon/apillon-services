import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE \`${DbTables.COLLECTION}\`
    SET royaltiesFees = royaltiesFees * 100;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE \`${DbTables.COLLECTION}\`
    SET royaltiesFees = royaltiesFees / 100;
  `);
}
