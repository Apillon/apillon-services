import { NFTCollectionType } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `
      INSERT INTO \`${DbTables.CONTRACT_VERSION}\` (\`status\`, \`collectionType\`, \`version\`)
      VALUES
      (5, '${NFTCollectionType.GENERIC}', 2),
      (5, '${NFTCollectionType.NESTABLE}', 1)
      ;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.CONTRACT_VERSION}\`
    WHERE (collectionType = '${NFTCollectionType.GENERIC}' AND version = 2) OR (collectionType = '${NFTCollectionType.NESTABLE}' AND version = 1);
  `);
}
