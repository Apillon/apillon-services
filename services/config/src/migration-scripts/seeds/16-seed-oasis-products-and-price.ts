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
    (${ProductCode.OASIS_SIGNATURE}, '${
      ProductCode[ProductCode.OASIS_SIGNATURE]
    }', 'Creation of new oasis signature', ${SqlModelStatus.ACTIVE}, '${ProductService.WALLET}', '${ProductCategory.SIGNATURE}')
;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES
    (${ProductCode.OASIS_SIGNATURE}, 20, ${SqlModelStatus.ACTIVE})
  ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT}
    WHERE id IN (${ProductCode.OASIS_SIGNATURE});
  `);
}
