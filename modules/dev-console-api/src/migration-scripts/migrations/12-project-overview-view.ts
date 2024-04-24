import { AppEnvironment, SqlModelStatus, env } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const databases = {
    consoleApiDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST
        : env.DEV_CONSOLE_API_MYSQL_DATABASE,
    storageDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.STORAGE_MYSQL_DATABASE_TEST
        : env.STORAGE_MYSQL_DATABASE,
    nftsDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.NFTS_MYSQL_DATABASE_TEST
        : env.NFTS_MYSQL_DATABASE,
    authDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_MYSQL_DATABASE_TEST
        : env.AUTH_API_MYSQL_DATABASE,
    computeDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_DATABASE_TEST
        : env.COMPUTING_MYSQL_DATABASE,
    socialDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SOCIAL_MYSQL_DATABASE_TEST
        : env.SOCIAL_MYSQL_DATABASE,
  };

  await queryFn(`
    CREATE OR REPLACE VIEW \`v_projectOverview\` AS
    SELECT p.project_uuid,
    (
      SELECT COUNT(*) from ${databases.storageDb}.bucket bucket
        WHERE bucket.project_uuid = p.project_uuid
        AND bucket.status = ${SqlModelStatus.ACTIVE}
        AND bucket.bucketType IN (1,3) # exclude hosting buckets
    ) as bucketCount,
    (
      SELECT COUNT(*) from ${databases.storageDb}.file file
        WHERE file.project_uuid = p.project_uuid
        AND file.status = ${SqlModelStatus.ACTIVE}
    ) as fileCount,
    (
      SELECT COUNT(*) from ${databases.storageDb}.website website
        WHERE website.project_uuid = p.project_uuid
        AND website.status = ${SqlModelStatus.ACTIVE}
    ) as websiteCount,
    (
      SELECT COUNT(*) from ${databases.nftsDb}.collection collection
        WHERE collection.project_uuid = p.project_uuid
        AND collection.collectionStatus <> 5 # failed
    ) as collectionCount,
    (
      SELECT COUNT(*) from ${databases.nftsDb}.transaction transaction
        JOIN ${databases.nftsDb}.collection collection ON collection.id = transaction.refId
        WHERE collection.project_uuid = p.project_uuid
        AND transaction.transactionStatus = 2 # confirmed
    ) as nftTransactionCount,
    (
      SELECT COUNT(*) from ${databases.authDb}.identity identity
        WHERE identity.project_uuid = p.project_uuid
        AND identity.state IN ('revoked', 'attested')
    ) as didCount,
    (
      SELECT COUNT(*) from ${databases.computeDb}.contract contract
        WHERE contract.project_uuid = p.project_uuid
        AND contract.contractStatus <> 6 # failed
    ) as contractCount,
    (
      SELECT COUNT(*) from ${databases.computeDb}.transaction transaction
        JOIN ${databases.computeDb}.contract contract ON contract.id = transaction.contract_id
        WHERE contract.project_uuid = p.project_uuid
        AND transaction.transactionStatus = 5 # worker-success
    ) as computingTransactionCount,
    (
      SELECT COUNT(*) from ${databases.socialDb}.space space
        WHERE space.project_uuid = p.project_uuid
        AND space.status = ${SqlModelStatus.ACTIVE}
    ) as spaceCount,
    (
      SELECT COUNT(*) from ${databases.socialDb}.post post
        WHERE post.project_uuid = p.project_uuid
        AND post.status = ${SqlModelStatus.ACTIVE}
    ) as postCount
    FROM ${databases.consoleApiDb}.project p
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP VIEW IF EXISTS \`v_projectOverview\`;
  `);
}
