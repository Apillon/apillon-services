import { AppEnvironment, env, getEnvSecrets } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await getEnvSecrets();
  const dbEnvMap = {
    [AppEnvironment.DEV]: 'dev',
    [AppEnvironment.STG]: 'staging',
    [AppEnvironment.PROD]: 'prod',
  };
  const StorageDB = `Apillon_storage_${dbEnvMap[env.APP_ENV]}`;
  const NftsDB = `Apillon_nfts_${dbEnvMap[env.APP_ENV]}`;
  await queryFn(`
    UPDATE ${DbTables.TRANSACTION_QUEUE} AS tq
    SET tq.project_uuid =
      CASE
        WHEN tq.referenceTable = 'file' THEN (
          SELECT f.project_uuid
          FROM ${StorageDB}.file AS f
          WHERE f.id = tq.referenceId
        )
        WHEN tq.referenceTable = 'collection' THEN (
          SELECT c.project_uuid
          FROM ${NftsDB}.collection AS c
          WHERE c.id = tq.referenceId
        )
        WHEN tq.referenceTable = 'directory' THEN (
          SELECT d.project_uuid
          FROM ${StorageDB}.directory AS d
          WHERE d.id = tq.referenceId
        )
        WHEN tq.referenceTable = 'bucket' THEN (
          SELECT b.project_uuid
          FROM ${StorageDB}.bucket AS b
          WHERE b.id = tq.referenceId
        )
        ELSE NULL
      END;
  `);

  await queryFn(`
    UPDATE ${DbTables.TRANSACTION_LOG} AS tl
    JOIN ${DbTables.TRANSACTION_QUEUE} AS tq
    ON tl.transactionQueue_id = tq.id
    SET tl.project_uuid = tq.project_uuid;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    UPDATE ${DbTables.TRANSACTION_QUEUE}
    SET project_uuid = NULL;
  `);

  await queryFn(`
    UPDATE ${DbTables.TRANSACTION_LOG}
    SET project_uuid = NULL;
  `);
}
