import { SubscriptionPackages } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.SUBSCRIPTION_PACKAGE} (id, status, name, description, isDefault)
      VALUES
      (${SubscriptionPackages.Freemium}, 5, 'Freemium', 'Freemium (Egg) plan', 1),
      (${SubscriptionPackages.Caterpillar}, 5, 'Caterpillar', 'Caterpillar plan', 0),
      (${SubscriptionPackages.Cocoon}, 5, 'Cocoon', 'Cocoon plan', 0),
      (${SubscriptionPackages.Butterfly}, 5, 'Butterfly', 'Butterfly plan', 0)
    ;
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
