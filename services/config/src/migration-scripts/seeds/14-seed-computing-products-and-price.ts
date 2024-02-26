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
    VALUES (${ProductCode.COMPUTING_SCHRODINGER_CREATE}, '${
      ProductCode[ProductCode.COMPUTING_SCHRODINGER_CREATE]
    }', 'Creation of Schrodinger contract', ${SqlModelStatus.ACTIVE},
    '${ProductService.COMPUTING}', '${ProductCategory.SCHRODINGER}'),
           (${ProductCode.COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT}, '${
             ProductCode[ProductCode.COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT]
           }', 'Assign CID to NFT on Schrodinger contract',
            ${SqlModelStatus.ACTIVE}, '${ProductService.COMPUTING}',
            '${ProductCategory.SCHRODINGER}'),
           (${ProductCode.COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP}, '${
             ProductCode[ProductCode.COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP]
           }', 'Transfer ownership of Schrodinger contract',
            ${SqlModelStatus.ACTIVE}, '${ProductService.COMPUTING}',
            '${ProductCategory.SCHRODINGER}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.COMPUTING_SCHRODINGER_CREATE}, 750,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT}, 50,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP}, 20,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT_PRICE}
    WHERE product_id IN (${ProductCode.COMPUTING_SCHRODINGER_CREATE}, ${ProductCode.COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT}, ${ProductCode.COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP});
  `);
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT}
    WHERE id IN (${ProductCode.COMPUTING_SCHRODINGER_CREATE}, ${ProductCode.COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT}, ${ProductCode.COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP});
  `);
}
