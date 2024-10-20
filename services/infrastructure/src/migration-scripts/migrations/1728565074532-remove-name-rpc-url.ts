import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`ALTER TABLE ${DbTables.RPC_URL} DROP COLUMN name`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`ALTER TABLE ${DbTables.RPC_URL} ADD COLUMN name VARCHAR(255)`);
}
