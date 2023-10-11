import { ProductCategory, ProductService } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE ${DbTables.PRODUCT} SET service =
      CASE
        WHEN name LIKE 'NFT%' THEN '${ProductService.NFT}'
        WHEN name LIKE 'HOSTING%' THEN '${ProductService.HOSTING}'
        WHEN name LIKE '%IDENTITY%' THEN '${ProductService.IDENTITY}'
      END;
  `);

  await queryFn(`
    UPDATE ${DbTables.PRODUCT}
    SET category =
      CASE
        WHEN name LIKE 'HOSTING%' THEN '${ProductCategory.WEBSITE}'
        WHEN name LIKE 'NFT_MOONBASE%' THEN '${ProductCategory.MOONBASE_NFT}'
        WHEN name LIKE 'NFT_MOONBEAM%' THEN '${ProductCategory.MOONBEAM_NFT}'
        WHEN name LIKE 'NFT_ASTAR%' THEN '${ProductCategory.ASTAR_NFT}'
        WHEN name LIKE '%IDENTITY%' THEN '${ProductCategory.KILT_IDENTITY}'
      END;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE \`${DbTables.PRODUCT}\` SET service = NULL;
    UPDATE \`${DbTables.PRODUCT}\` SET category = NULL;
  `);
}
