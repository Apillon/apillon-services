import { DefaultPermission, DefaultUserRole } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ROLE_PERMISSION} (role_id, permission_id)
    VALUES
     (${DefaultUserRole.USER}, ${DefaultPermission.COMPUTING})
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.ROLE_PERMISSION}
    WHERE permission_id IN (${DefaultPermission.COMPUTING})
    AND role_id IN (${DefaultUserRole.USER});
  `);
}
