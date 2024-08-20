import { QuotaCode, QuotaType, SubscriptionPackageId } from '@apillon/lib';
import { SubscriptionPackage } from '../../modules/subscription/models/subscription-package.model';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value, type)
    VALUES 
    (${QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS}, 5, 'Embedded wallet', 'Embedded wallet integrations', 'Max embedded wallet integrations', 1, 1, ${QuotaType.FOR_PROJECT}),
    (${QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES}, 5, 'Embedded wallet', 'Embedded wallet signatures', 'Max signatures per project in month', 1, 100, ${QuotaType.FOR_PROJECT});
  `);

  //Caterpillar subscription plan
  await queryFn(`
    INSERT INTO override (quota_id, status, package_id, description, value)
    VALUES 
    (${QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS}, 5, ${SubscriptionPackageId.CATERPILLAR} ,'Caterpillar plan embedded wallet integrations', 5),
    (${QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES}, 5, ${SubscriptionPackageId.CATERPILLAR} ,'Caterpillar plan embedded wallet signatures', 500);
  `);

  //Cocoon subscription plan
  await queryFn(`
    INSERT INTO override (quota_id, status, package_id, description, value)
    VALUES 
    (${QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS}, 5, ${SubscriptionPackageId.COCOON} ,'Cocoon plan embedded wallet integrations', 10),
    (${QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES}, 5, ${SubscriptionPackageId.COCOON} ,'Cocoon plan embedded wallet signatures', 1000);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id IN (${QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS}, ${QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES});
  `);
}
