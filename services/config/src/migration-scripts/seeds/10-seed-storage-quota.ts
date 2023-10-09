import { QuotaCode, QuotaType } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value, type)
    VALUES 
    (${QuotaCode.MAX_STORAGE}, 5, 'Storage', 'Storage space', 'Max used storage space per project', 1, 3, ${QuotaType.FOR_PROJECT}),
    (${QuotaCode.MAX_BANDWIDTH}, 5, 'Network', 'IPFS bandwidth', 'Max used network bandwidth per project', 1, 3, ${QuotaType.FOR_PROJECT})
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id IN (${QuotaCode.MAX_STORAGE}, ${QuotaCode.MAX_BANDWIDTH});
  `);
}
