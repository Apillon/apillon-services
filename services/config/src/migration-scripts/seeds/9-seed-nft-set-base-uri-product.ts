import { DbTables } from '../../config/types';
import { ProductCode, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES
    (${ProductCode.NFT_MOONBEAM_SET_BASE_URI}, '${
    ProductCode[ProductCode.NFT_MOONBEAM_SET_BASE_URI]
  }', 'Set Moonbeam collection base URI', ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_MOONBASE_SET_BASE_URI}, '${
    ProductCode[ProductCode.NFT_MOONBASE_SET_BASE_URI]
  }', 'Set Moonbase collection base URI', ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_ASTAR_SET_BASE_URI}, '${
    ProductCode[ProductCode.NFT_ASTAR_SET_BASE_URI]
  }', 'Set Astar collection base URI', ${SqlModelStatus.ACTIVE})
;
  `);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES
    (${ProductCode.NFT_MOONBEAM_SET_BASE_URI}, 4, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_MOONBASE_SET_BASE_URI}, 1, ${SqlModelStatus.ACTIVE}),
    (${ProductCode.NFT_ASTAR_SET_BASE_URI}, 1, ${SqlModelStatus.ACTIVE})
      ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT};
  `);
}
