import { QuotaCode, SubscriptionPackageId } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  INSERT INTO ${DbTables.SUBSCRIPTION_PACKAGE} (id, status, name, description, isDefault, creditAmount, stripeId)
    VALUES (${SubscriptionPackageId.RPC_PLAN}, 5, 'RPC Plan', 'RPC Plan', 0,0,'')`);

  // To-do clarify the max rpc keys for RPC Plan
  await queryFn(`
  INSERT INTO ${DbTables.OVERRIDE} (quota_id, status, package_id, description, value) VALUES 
  (${QuotaCode.MAX_RPC_KEYS}, 5, ${SubscriptionPackageId.RPC_PLAN}, 'Max RPC keys for RPC Plan', 10)`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DELETE FROM ${DbTables.SUBSCRIPTION_PACKAGE} WHERE id = 5`);
}
