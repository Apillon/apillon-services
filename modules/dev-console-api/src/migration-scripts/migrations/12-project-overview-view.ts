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
    SELECT
      p.project_uuid,
      COUNT(DISTINCT b.id) AS bucketCount,
      COUNT(DISTINCT f.id) AS fileCont,
      COUNT(DISTINCT w.id) AS websiteCount,
      COUNT(DISTINCT nft.id) AS collectionCount,
      COUNT(DISTINCT nftTx.id) AS nftTransactionCount,
      COUNT(DISTINCT did.id) AS didCount,
      COUNT(DISTINCT comp.id) AS contractCount,
      COUNT(DISTINCT compTx.id) AS computingTransactionCount,
      COUNT(DISTINCT space.id) AS spaceCount,
      COUNT(DISTINCT post.id) AS postCount
    FROM ${databases.consoleApiDb}.project p
    LEFT JOIN ${databases.storageDb}.bucket b ON b.project_uuid = p.project_uuid AND b.status = ${SqlModelStatus.ACTIVE}
    LEFT JOIN ${databases.storageDb}.file f ON f.project_uuid = p.project_uuid AND f.status = ${SqlModelStatus.ACTIVE}
    LEFT JOIN ${databases.storageDb}.website w ON w.project_uuid = p.project_uuid AND w.status = ${SqlModelStatus.ACTIVE}
    LEFT JOIN ${databases.nftsDb}.collection nft ON nft.project_uuid = p.project_uuid AND nft.status = ${SqlModelStatus.ACTIVE}
    LEFT JOIN ${databases.nftsDb}.transaction nftTx ON nftTx.refId = nft.id
    LEFT JOIN ${databases.authDb}.identity did ON did.project_uuid = p.project_uuid AND did.state = 'attested'
    LEFT JOIN ${databases.computeDb}.contract comp ON comp.project_uuid = p.project_uuid AND comp.status = ${SqlModelStatus.ACTIVE}
    LEFT JOIN ${databases.computeDb}.transaction compTx ON compTx.contract_id = comp.id
    LEFT JOIN ${databases.socialDb}.space space ON space.project_uuid = p.project_uuid AND space.status = ${SqlModelStatus.ACTIVE}
    LEFT JOIN ${databases.socialDb}.post post ON post.space_id = space.id AND post.status = ${SqlModelStatus.ACTIVE}
    GROUP BY p.project_uuid;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP VIEW IF EXISTS \`v_projectOverview\`;
  `);
}
