import { ProductCode, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    UPDATE ${DbTables.PRODUCT_PRICE}
    SET status = ${SqlModelStatus.DELETED}
    WHERE product_id = ${ProductCode.HOSTING_DEPLOY_TO_STAGING}`);

  await queryFn(`
    UPDATE ${DbTables.PRODUCT}
    SET status = ${SqlModelStatus.DELETED}
    WHERE id = ${ProductCode.HOSTING_DEPLOY_TO_STAGING}
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    UPDATE ${DbTables.PRODUCT_PRICE}
    SET status = ${SqlModelStatus.ACTIVE}
    WHERE product_id = ${ProductCode.HOSTING_DEPLOY_TO_STAGING}
  `);

  await queryFn(`
    UPDATE ${DbTables.PRODUCT}
    SET status = ${SqlModelStatus.ACTIVE}
    WHERE id = ${ProductCode.HOSTING_DEPLOY_TO_STAGING}
  `);
}
