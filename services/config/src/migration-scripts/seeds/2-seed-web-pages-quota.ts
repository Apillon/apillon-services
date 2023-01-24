import { QuotaCode } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value)
    VALUES 
    (${QuotaCode.MAX_WEB_PAGES}, 5, 'Storage', 'Web pages count limit', 'Max number of web pages inside project', 1, 1)
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id = 8;
  `);
}
