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
    VALUES (${ProductCode.NFT_BASE_COLLECTION}, '${
      ProductCode[ProductCode.NFT_BASE_COLLECTION]
    }', 'Create new Base NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_NFT}'),

           (${ProductCode.NFT_BASE_MINT}, '${
             ProductCode[ProductCode.NFT_BASE_MINT]
           }', 'Mint Base NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_NFT}'),

           (${ProductCode.NFT_BASE_BURN}, '${
             ProductCode[ProductCode.NFT_BASE_BURN]
           }', 'Burn Base NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_NFT}'),

           (${ProductCode.NFT_BASE_TRANSFER_COLLECTION}, '${
             ProductCode[ProductCode.NFT_BASE_TRANSFER_COLLECTION]
           }', 'Transfer Base NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_NFT}'),

           (${ProductCode.NFT_BASE_SET_BASE_URI}, '${
             ProductCode[ProductCode.NFT_BASE_SET_BASE_URI]
           }', 'Set Base MFT collection base URI',
            ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_NFT}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.NFT_BASE_COLLECTION}, 500, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_MINT}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_BURN}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_TRANSFER_COLLECTION}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_SET_BASE_URI}, 2, ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [
    ProductCode.NFT_BASE_COLLECTION,
    ProductCode.NFT_BASE_MINT,
    ProductCode.NFT_BASE_BURN,
    ProductCode.NFT_BASE_TRANSFER_COLLECTION,
    ProductCode.NFT_BASE_SET_BASE_URI,
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
