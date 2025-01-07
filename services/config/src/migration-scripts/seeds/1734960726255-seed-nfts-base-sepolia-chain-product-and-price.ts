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
    VALUES (${ProductCode.NFT_BASE_SEPOLIA_COLLECTION}, '${
      ProductCode[ProductCode.NFT_BASE_SEPOLIA_COLLECTION]
    }', 'Create new Base Sepolia NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_SEPOLIA_NFT}'),

           (${ProductCode.NFT_BASE_SEPOLIA_MINT}, '${
             ProductCode[ProductCode.NFT_BASE_SEPOLIA_MINT]
           }', 'Mint Base Sepolia NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_SEPOLIA_NFT}'),

           (${ProductCode.NFT_BASE_SEPOLIA_BURN}, '${
             ProductCode[ProductCode.NFT_BASE_SEPOLIA_BURN]
           }', 'Burn Base Sepolia NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_SEPOLIA_NFT}'),

           (${ProductCode.NFT_BASE_SEPOLIA_TRANSFER_COLLECTION}, '${
             ProductCode[ProductCode.NFT_BASE_SEPOLIA_TRANSFER_COLLECTION]
           }', 'Transfer Base Sepolia NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_SEPOLIA_NFT}'),

           (${ProductCode.NFT_BASE_SEPOLIA_SET_BASE_URI}, '${
             ProductCode[ProductCode.NFT_BASE_SEPOLIA_SET_BASE_URI]
           }', 'Set Base Sepolia MFT collection base URI',
            ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.BASE_SEPOLIA_NFT}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.NFT_BASE_SEPOLIA_COLLECTION}, 500,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_SEPOLIA_MINT}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_SEPOLIA_BURN}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_SEPOLIA_TRANSFER_COLLECTION}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_BASE_SEPOLIA_SET_BASE_URI}, 2,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [
    ProductCode.NFT_BASE_SEPOLIA_COLLECTION,
    ProductCode.NFT_BASE_SEPOLIA_MINT,
    ProductCode.NFT_BASE_SEPOLIA_BURN,
    ProductCode.NFT_BASE_SEPOLIA_TRANSFER_COLLECTION,
    ProductCode.NFT_BASE_SEPOLIA_SET_BASE_URI,
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
