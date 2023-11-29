import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PROMO_CODE} (id, code, creditAmount, validUntil, maxUses, status)
    VALUES
    (1, 'FREE10K', 10000, '2023-12-05 20:00:00', 300, 5)
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PROMO_CODE};
  `);
}
