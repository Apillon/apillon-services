import { QuotaType, SqlModelStatus } from '@apillon/lib';
import { QuotaCode } from '@apillon/lib';
export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value, type)
    VALUES
    (${QuotaCode.MAX_RPC_KEYS}, ${SqlModelStatus.ACTIVE}, 'RPC', 'RPC Key limit', 'Max RPC keys per user', 1, 1, ${QuotaType.FOR_OBJECT})
;
  `);
}
export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id = ${QuotaCode.MAX_RPC_KEYS};
  `);
}
