import { DbTables } from '../../config/types';
import {
  ProductCategory,
  ProductCode,
  ProductService,
  SqlModelStatus,
} from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status, service, category)
    VALUES (${ProductCode.SIMPLET_NFT_STUDIO_DEPLOY}, '${
      ProductCode[ProductCode.SIMPLET_NFT_STUDIO_DEPLOY]
    }', '', ${SqlModelStatus.ACTIVE}, '${ProductService.SIMPLETS}', '${ProductCategory.SIMPLETS_NFT_STUDIO}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.SIMPLET_NFT_STUDIO_DEPLOY}, 100, ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT_PRICE}
    WHERE product_id IN (${ProductCode.SIMPLET_NFT_STUDIO_DEPLOY});
  `);
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT}
    WHERE id IN (${ProductCode.SIMPLET_NFT_STUDIO_DEPLOY});
  `);
}
