import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.SUBSCRIPTION_PACKAGE} (id, status, name, description, isDefault, creditAmount, stripeId)
      VALUES
      (1, 5, 'Freemium', 'Freemium (Egg) plan', 1, 1200, ''),
      (2, 5, 'Caterpillar', 'Caterpillar plan', 0, 5000, 'price_1Nrgz4GlTglE98hYob7iAKQf'),
      (3, 5, 'Cocoon', 'Cocoon plan', 0, 20000, 'price_1Nrg86GlTglE98hYQaizYCwB'),
      (4, 5, 'Butterfly', 'Butterfly plan', 0, 0, '');
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.SUBSCRIPTION_PACKAGE}
    WHERE id <= 4;
  `);
}
