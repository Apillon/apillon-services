import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.CONTRACT_VERSION}
     SET status = 3
     WHERE collectionType = 2;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.CONTRACT_VERSION}
     SET status = 5
     WHERE collectionType = 2;`,
  );
}
