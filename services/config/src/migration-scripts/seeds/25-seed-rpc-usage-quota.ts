import { SqlModelStatus } from '@apillon/lib';
import { QuotaCode } from '@apillon/lib';
export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value)
    VALUES
    (${QuotaCode.MAX_RPC_USAGE}, ${SqlModelStatus.ACTIVE}, 'RPC', 'RPC Usage limit', 'Max RPC usage per project', 1, 0)
;
  `);
}
export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id = ${QuotaCode.MAX_RPC_USAGE};
  `);
}
