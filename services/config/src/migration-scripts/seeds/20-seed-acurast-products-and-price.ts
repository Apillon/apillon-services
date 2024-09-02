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
    VALUES (${ProductCode.COMPUTING_JOB_CREATE}, '${
      ProductCode[ProductCode.COMPUTING_JOB_CREATE]
    }', 'Create new Acurast job', ${SqlModelStatus.ACTIVE},
            '${ProductService.COMPUTING}', '${ProductCategory.ACURAST}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.COMPUTING_JOB_CREATE}, 100, ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [ProductCode.COMPUTING_JOB_CREATE];
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
