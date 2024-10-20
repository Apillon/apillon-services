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
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status, service,
                                     category)
    VALUES (${ProductCode.NFT_UNIQUE_COLLECTION}, '${
      ProductCode[ProductCode.NFT_UNIQUE_COLLECTION]
    }', 'Create new Unique NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.UNIQUE_NFT}'),

           (${ProductCode.NFT_UNIQUE_MINT}, '${
             ProductCode[ProductCode.NFT_UNIQUE_MINT]
           }', 'Mint Unique NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.UNIQUE_NFT}'),

           (${ProductCode.NFT_UNIQUE_BURN}, '${
             ProductCode[ProductCode.NFT_UNIQUE_BURN]
           }', 'Burn Unique NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.UNIQUE_NFT}'),

           (${ProductCode.NFT_UNIQUE_TRANSFER_COLLECTION}, '${
             ProductCode[ProductCode.NFT_UNIQUE_TRANSFER_COLLECTION]
           }', 'Transfer Unique NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.UNIQUE_NFT}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.NFT_UNIQUE_COLLECTION}, 500,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_UNIQUE_MINT}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_UNIQUE_BURN}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_UNIQUE_TRANSFER_COLLECTION}, 2,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [
    ProductCode.NFT_UNIQUE_COLLECTION,
    ProductCode.NFT_UNIQUE_MINT,
    ProductCode.NFT_UNIQUE_BURN,
    ProductCode.NFT_UNIQUE_TRANSFER_COLLECTION,
  ];
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT_PRICE}
    WHERE product_id IN (${ids.join(',')});
  `);
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT}
    WHERE id IN (${ids.join(',')});
  `);
}
