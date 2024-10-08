import {
  DefaultPermission,
  DefaultUserRole,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  INSERT INTO ${DbTables.PERMISSION} (id, status, name)
  VALUES (${DefaultPermission.RPC}, ${SqlModelStatus.ACTIVE}, 'RPC Permission')`);

  await queryFn(`
  INSERT INTO ${DbTables.ROLE_PERMISSION} (role_id, permission_id)
  VALUES (${DefaultUserRole.USER}, ${DefaultPermission.RPC})`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE FROM ${DbTables.ROLE_PERMISSION} WHERE permission_id = ${DefaultPermission.RPC}`,
  );
  await queryFn(
    `DELETE FROM ${DbTables.PERMISSION} WHERE id = ${DefaultPermission.RPC}`,
  );
}
