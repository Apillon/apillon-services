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
    VALUES (${ProductCode.NFT_ASTAR_WASM_COLLECTION}, '${
      ProductCode[ProductCode.NFT_ASTAR_WASM_COLLECTION]
    }', 'Create new Astar WASM NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ASTAR_NFT}'),

           (${ProductCode.NFT_ASTAR_WASM_MINT}, '${
             ProductCode[ProductCode.NFT_ASTAR_WASM_MINT]
           }', 'Mint Astar WASM NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ASTAR_NFT}'),

           (${ProductCode.NFT_ASTAR_WASM_BURN}, '${
             ProductCode[ProductCode.NFT_ASTAR_WASM_BURN]
           }', 'Burn Astar WASM NFT', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ASTAR_NFT}'),

           (${ProductCode.NFT_ASTAR_WASM_TRANSFER_COLLECTION}, '${
             ProductCode[ProductCode.NFT_ASTAR_WASM_TRANSFER_COLLECTION]
           }', 'Transfer Astar WASM NFT collection', ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ASTAR_NFT}'),

           (${ProductCode.NFT_ASTAR_WASM_SET_BASE_URI}, '${
             ProductCode[ProductCode.NFT_ASTAR_WASM_SET_BASE_URI]
           }', 'Set Astar WASM MFT collection base URI',
            ${SqlModelStatus.ACTIVE},
            '${ProductService.NFT}', '${ProductCategory.ASTAR_NFT}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.NFT_ASTAR_WASM_COLLECTION}, 500,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ASTAR_WASM_MINT}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ASTAR_WASM_BURN}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ASTAR_WASM_TRANSFER_COLLECTION}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.NFT_ASTAR_WASM_SET_BASE_URI}, 2,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [
    ProductCode.NFT_ASTAR_WASM_COLLECTION,
    ProductCode.NFT_ASTAR_WASM_MINT,
    ProductCode.NFT_ASTAR_WASM_BURN,
    ProductCode.NFT_ASTAR_WASM_TRANSFER_COLLECTION,
    ProductCode.NFT_ASTAR_WASM_SET_BASE_URI,
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
