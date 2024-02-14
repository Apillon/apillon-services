import { DbTables } from '../../config/types';
import { ProductCode, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES
    (${ProductCode.SOCIAL_SPACE}, '${
    ProductCode[ProductCode.SOCIAL_SPACE]
  }', 'Creation of new hub', ${SqlModelStatus.ACTIVE}),
    (${ProductCode.SOCIAL_POST}, '${
    ProductCode[ProductCode.SOCIAL_POST]
  }', 'Creation of new channel', ${SqlModelStatus.ACTIVE})
;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES
    (${ProductCode.SOCIAL_SPACE}, 100, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.SOCIAL_POST}, 10, ${SqlModelStatus.ACTIVE})
  ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT}
    WHERE id IN (${ProductCode.SOCIAL_SPACE}, ${ProductCode.SOCIAL_POST});
  `);
}
