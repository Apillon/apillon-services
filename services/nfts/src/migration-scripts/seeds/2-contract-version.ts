import { ChainType, NFTCollectionType } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    // ABI and bytecode will be manually inserted into DB
    `
      INSERT INTO \`${DbTables.CONTRACT_VERSION}\` (\`id\`, \`status\`, \`collectionType\`, \`chainType\`, \`version\`, \`abi\`, \`bytecode\`)
      VALUES
      (1, 5, ${NFTCollectionType.GENERIC}, ${ChainType.EVM}, 1, '{}', ''),
      (2, 5, ${NFTCollectionType.GENERIC}, ${ChainType.EVM}, 2, '{}', ''),
      (3, 5, ${NFTCollectionType.NESTABLE}, ${ChainType.EVM}, 1, '{}', '')
      ;
    `,
  );

  await queryFn(
    `UPDATE \`${DbTables.COLLECTION}\` SET contractVersion_id = 1;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.CONTRACT_VERSION}\`
    WHERE id <=3;
  `);
}
