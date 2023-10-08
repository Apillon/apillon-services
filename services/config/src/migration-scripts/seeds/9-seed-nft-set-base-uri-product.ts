import { DbTables } from '../../config/types';
import { ProductCode, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES 
    (${ProductCode.NFT_SET_BASE_URI}, '${
    ProductCode[ProductCode.NFT_SET_BASE_URI]
  }', 'Set nft collection base uri', ${SqlModelStatus.ACTIVE})
;
  `);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES 
    (${ProductCode.NFT_SET_BASE_URI}, 4, ${SqlModelStatus.ACTIVE})
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT};
  `);
}
