import {
  QuotaCode,
  QuotaType,
  SqlModelStatus,
  SubscriptionPackageId,
} from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    INSERT INTO ${DbTables.QUOTA} (id, status, groupName, name, description, valueType, value, type)
    VALUES (${QuotaCode.MAX_SIMPLET_COUNT}, ${SqlModelStatus.ACTIVE}, 'Deploy', 'Active simplet count',
            'Number of simplets that can be deployed by a project', 1, 1, ${QuotaType.FOR_PROJECT});
  `);

  await queryFn(`
    INSERT INTO ${DbTables.OVERRIDE} (quota_id, status, package_id, description, value) VALUES (${QuotaCode.MAX_SIMPLET_COUNT},
                                                                                                ${SqlModelStatus.ACTIVE},
                                                                                                ${SubscriptionPackageId.CATERPILLAR},
                                                                                                'Caterpillar plan - Active simplet count',
                                                                                                3),
                                                                                               (${QuotaCode.MAX_SIMPLET_COUNT},
                                                                                                ${SqlModelStatus.ACTIVE},
                                                                                                ${SubscriptionPackageId.COCOON},
                                                                                                'Cocoon plan - Active simplet count',
                                                                                                3),
                                                                                               (${QuotaCode.MAX_SIMPLET_COUNT},
                                                                                                ${SqlModelStatus.ACTIVE},
                                                                                                ${SubscriptionPackageId.BUTTERFLY},
                                                                                                'Butterfly plan - Active simplet count',
                                                                                                3);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE
     FROM ${DbTables.OVERRIDE}
     where quota_id = ${QuotaCode.MAX_SIMPLET_COUNT};`,
  );

  await queryFn(`
    DELETE FROM ${DbTables.QUOTA}
    WHERE id = ${QuotaCode.MAX_SIMPLET_COUNT};
  `);
}
