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
    VALUES (${ProductCode.NFT_ETHEREUM_COLLECTION}, '${
      ProductCode[ProductCode.NFT_ETHEREUM_COLLECTION]
    }', 'Create new Ethereum NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ETHEREUM_NFT}'),

           (${ProductCode.NFT_ETHEREUM_MINT}, '${
             ProductCode[ProductCode.NFT_ETHEREUM_MINT]
           }', 'Mint Ethereum NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ETHEREUM_NFT}'),

           (${ProductCode.NFT_ETHEREUM_BURN}, '${
             ProductCode[ProductCode.NFT_ETHEREUM_BURN]
           }', 'Burn Ethereum NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ETHEREUM_NFT}'),

           (${ProductCode.NFT_ETHEREUM_TRANSFER_COLLECTION}, '${
             ProductCode[ProductCode.NFT_ETHEREUM_TRANSFER_COLLECTION]
           }', 'Transfer Ethereum NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ETHEREUM_NFT}'),

           (${ProductCode.NFT_ETHEREUM_SET_BASE_URI}, '${
             ProductCode[ProductCode.NFT_ETHEREUM_SET_BASE_URI]
           }', 'Set Ethereum MFT collection base URI',
            ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ETHEREUM_NFT}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.NFT_ETHEREUM_COLLECTION}, 500,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ETHEREUM_MINT}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ETHEREUM_BURN}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ETHEREUM_TRANSFER_COLLECTION}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ETHEREUM_SET_BASE_URI}, 2,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [
    ProductCode.NFT_ETHEREUM_COLLECTION,
    ProductCode.NFT_ETHEREUM_MINT,
    ProductCode.NFT_ETHEREUM_BURN,
    ProductCode.NFT_ETHEREUM_TRANSFER_COLLECTION,
    ProductCode.NFT_ETHEREUM_SET_BASE_URI,
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
