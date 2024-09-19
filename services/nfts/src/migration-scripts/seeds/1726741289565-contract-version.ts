import { DbTables } from '../../config/types';
import { NFTCollectionType, ChainType, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `INSERT INTO \`${DbTables.CONTRACT_VERSION}\`
      (\`collectionType \`, \`chainType\`, \`version\`, \`abi\`, \`bytecode\`, \`status\`)
      VALUES
      (${NFTCollectionType.GENERIC}, ${ChainType.EVM}, 3, '', '', ${SqlModelStatus.ACTIVE});`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE FROM \`${DbTables.CONTRACT_VERSION}\`
      WHERE \`collectionType\` = ${NFTCollectionType.GENERIC}
      AND \`chainType\` = ${ChainType.EVM}
      AND \`version\` = 3;`,
  );
}
