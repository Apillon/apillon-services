import { DbTables } from '../../config/types';
import { NFTCollectionType, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.CONTRACT_VERSION}
     SET status = ${SqlModelStatus.INACTIVE}
     WHERE collectionType = ${NFTCollectionType.NESTABLE};`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.CONTRACT_VERSION}
     SET status = ${SqlModelStatus.ACTIVE}
     WHERE collectionType = ${NFTCollectionType.NESTABLE};`,
  );
}
