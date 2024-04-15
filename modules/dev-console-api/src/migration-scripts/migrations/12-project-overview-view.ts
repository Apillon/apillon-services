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
        where bucket.project_uuid = p.project_uuid
        and bucket.status = ${SqlModelStatus.ACTIVE}
    ) as bucketCount,
    (
      SELECT COUNT(*) from ${databases.storageDb}.file file
        where file.project_uuid = p.project_uuid
        and file.status = ${SqlModelStatus.ACTIVE}
    ) as fileCount,
    (
      SELECT COUNT(*) from ${databases.storageDb}.website website
        where website.project_uuid = p.project_uuid
        and website.status = ${SqlModelStatus.ACTIVE}
    ) as websiteCount,
    (
      SELECT COUNT(*) from ${databases.nftsDb}.collection collection
        where collection.project_uuid = p.project_uuid
    ) as collectionCount,
    (
      SELECT COUNT(*) from ${databases.nftsDb}.transaction transaction
        JOIN ${databases.nftsDb}.collection collection ON collection.id = transaction.refId
        where collection.project_uuid = p.project_uuid
    ) as nftTransactionCount,
    (
      SELECT COUNT(*) from ${databases.authDb}.identity identity
        where identity.project_uuid = p.project_uuid
        and identity.state IN ('revoked', 'attested')
    ) as didCount,
    (
      SELECT COUNT(*) from ${databases.computeDb}.contract contract
        where contract.project_uuid = p.project_uuid
    ) as contractCount,
    (
      SELECT COUNT(*) from ${databases.computeDb}.transaction transaction
        JOIN ${databases.computeDb}.contract contract ON contract.id = transaction.contract_id
        where contract.project_uuid = p.project_uuid
    ) as computingTransactionCount,
    (
      SELECT COUNT(*) from ${databases.socialDb}.space space
        where space.project_uuid = p.project_uuid
    ) as spaceCount,
    (
      SELECT COUNT(*) from ${databases.socialDb}.post post
        where post.project_uuid = p.project_uuid
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
