import { DbTables } from '../../config/types';
import { ProductCode, ProductService, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status, service, category)
    VALUES
    (${ProductCode.IPNS}, '${
      ProductCode[ProductCode.IPNS]
    }', '', ${SqlModelStatus.ACTIVE}, `${ProductService.STORAGE}`, 'IPNS')
;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES
    (${ProductCode.IPNS}, 150, ${SqlModelStatus.ACTIVE})
  ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT}
    WHERE id IN (${ProductCode.IPNS});
  `);
}
