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
    VALUES
    (${ProductCode.INDEXER}, '${
      ProductCode[ProductCode.INDEXER]
    }', '', ${SqlModelStatus.ACTIVE}, '${ProductService.INDEXER}', '${ProductCategory.INDEXER}')
;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES
    (${ProductCode.INDEXER}, 0, ${SqlModelStatus.ACTIVE})
  ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT}
    WHERE id IN (${ProductCode.INDEXER});
  `);
}
