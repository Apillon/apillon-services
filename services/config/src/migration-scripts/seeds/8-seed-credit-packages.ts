import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.CREDIT_PACKAGE} (id, status, name, description, creditAmount, bonusCredits, stripeId)
      VALUES
      (1, 5, '10K', '10000 Credits', 10000, 0, 'price_1Nuwj5GlTglE98hYGQfzXjtO'),
      (2, 5, '20K', '20000 Credits', 20000, 2000, 'price_1NuwjpGlTglE98hYPMFte4Bn'),
      (3, 5, '50K', '50000 Credits', 50000, 7500, 'price_1Nuwl8GlTglE98hYejzFIZqG');
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.CREDIT_PACKAGE}
    WHERE id <= 3;
  `);
}
