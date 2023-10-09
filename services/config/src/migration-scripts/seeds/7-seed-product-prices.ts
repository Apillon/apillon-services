import { DbTables } from '../../config/types';
import { ProductCode, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES
    (${ProductCode.HOSTING_WEBSITE}, 100, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.HOSTING_DEPLOY_TO_STAGING}, 10, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.HOSTING_DEPLOY_TO_PRODUCTION}, 20, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.HOSTING_CHANGE_WEBSITE_DOMAIN}, 50, ${SqlModelStatus.ACTIVE}),

    (${ProductCode.NFT_MOONBEAM_COLLECTION}, 1000, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_MOONBASE_COLLECTION}, 100, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_ASTAR_COLLECTION}, 100, ${SqlModelStatus.ACTIVE}),

    (${ProductCode.NFT_MOONBEAM_MINT}, 4, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_MOONBASE_MINT}, 1, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_ASTAR_MINT}, 1, ${SqlModelStatus.ACTIVE}),

    (${ProductCode.NFT_MOONBEAM_BURN}, 4, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_MOONBASE_BURN}, 1, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_ASTAR_BURN}, 1, ${SqlModelStatus.ACTIVE}),

    (${ProductCode.NFT_MOONBEAM_TRANSFER_COLLECTION}, 4, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_MOONBASE_TRANSFER_COLLECTION}, 1, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_ASTAR_TRANSFER_COLLECTION}, 1, ${SqlModelStatus.ACTIVE}),

    (${ProductCode.KILT_IDENTITY}, 4000, ${SqlModelStatus.ACTIVE})
  ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT_PRICE};
  `);
}
