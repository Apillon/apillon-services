import { DbTables } from '../../config/types';
import { Products, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES 
    (${Products.WEBSITE}, 100, ${SqlModelStatus.ACTIVE}),
    (${Products.DEPLOY_TO_STAGING}, 10, ${SqlModelStatus.ACTIVE}),
    (${Products.DEPLOY_TO_PRODUCTION}, 20, ${SqlModelStatus.ACTIVE}),
    (${Products.CHANGE_WEBSITE_DOMAIN}, 50, ${SqlModelStatus.ACTIVE}),
    (${Products.NFT_COLLECTION}, 1000, ${SqlModelStatus.ACTIVE}),
    (${Products.MINT_NFT}, 4, ${SqlModelStatus.ACTIVE}),
    (${Products.BURN_NFT}, 4, ${SqlModelStatus.ACTIVE}),
    (${Products.TRANSFER_COLLECTION}, 4, ${SqlModelStatus.ACTIVE}),
    (${Products.KILT_IDENTITY}, 4000, ${SqlModelStatus.ACTIVE})
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT_PRICE};
  `);
}
