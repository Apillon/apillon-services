import { ProductCode, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
   DELETE FROM ${DbTables.PRODUCT_PRICE} WHERE product_id = ${ProductCode.HOSTING_DEPLOY_TO_STAGING}
  `);

  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT} WHERE id = ${ProductCode.HOSTING_DEPLOY_TO_STAGING}
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES (${ProductCode.HOSTING_DEPLOY_TO_STAGING},  '${
      ProductCode[ProductCode.HOSTING_DEPLOY_TO_STAGING]
    }','Deploy website content to staging environment', ${SqlModelStatus.ACTIVE})
  `);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.HOSTING_DEPLOY_TO_STAGING}, 10, ${SqlModelStatus.ACTIVE})
  `);
}
