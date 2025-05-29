import { QuotaCode, SqlModelStatus, SubscriptionPackageId } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    INSERT INTO ${DbTables.QUOTA} (id, status, groupName, name, description, valueType, value)
    VALUES
    (${QuotaCode.MAX_SIMPLET_BACKEND_COUNT}, ${SqlModelStatus.ACTIVE}, 'Deploy', 'Active simplet backend count', 'Number of backend simplets that can be deployed by a project',1, 1);
  `);

  await queryFn(`
    INSERT INTO ${DbTables.OVERRIDE} (quota_id, status, package_id, description, value) VALUES
    (${QuotaCode.MAX_SIMPLET_BACKEND_COUNT}, ${SqlModelStatus.ACTIVE}, ${SubscriptionPackageId.CATERPILLAR},'Caterpillar plan - Active simplet backend count', 3),
    (${QuotaCode.MAX_SIMPLET_BACKEND_COUNT}, ${SqlModelStatus.ACTIVE}, ${SubscriptionPackageId.COCOON},'Cocoon plan - Active simplet backend count', 3),
    (${QuotaCode.MAX_SIMPLET_BACKEND_COUNT}, ${SqlModelStatus.ACTIVE}, ${SubscriptionPackageId.BUTTERFLY},'Butterfly plan - Active simplet backend count', 3);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    DELETE FROM ${DbTables.QUOTA}
    WHERE id = ${QuotaCode.MAX_SIMPLET_BACKEND_COUNT};
  `);
}
