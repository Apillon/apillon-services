import { DefaultPermission, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  INSERT INTO ${DbTables.PERMISSION} (id, status, name)
  VALUES (${DefaultPermission.RPC}, ${SqlModelStatus.ACTIVE}, 'RPC Permission)`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  DELETE FROM ${DbTables.PERMISSION} WHERE id = ${DefaultPermission.RPC}`);
}
