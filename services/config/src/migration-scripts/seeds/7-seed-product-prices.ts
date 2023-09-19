import { DbTables } from '../../config/types';
import { Products } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price)
    VALUES 
    (${Products.WEBSITE}, 10),
    (${Products.DEPLOY_TO_STAGING}, 10),
    (${Products.DEPLOY_TO_PRODUCTION}, 100);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT_PRICE};
  `);
}
