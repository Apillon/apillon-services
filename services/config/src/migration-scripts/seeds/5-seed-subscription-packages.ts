import { SubscriptionPackages } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.SUBSCRIPTION_PACKAGE} (id, status, name, description, isDefault, creditAmount)
      VALUES
      (${SubscriptionPackages.Freemium}, 5, 'Freemium', 'Freemium (Egg) plan', 1, 1500),
      (${SubscriptionPackages.Caterpillar}, 5, 'Caterpillar', 'Caterpillar plan', 0, 5000),
      (${SubscriptionPackages.Cocoon}, 5, 'Cocoon', 'Cocoon plan', 0, 20000),
      (${SubscriptionPackages.Butterfly}, 5, 'Butterfly', 'Butterfly plan', 0, 0);
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
