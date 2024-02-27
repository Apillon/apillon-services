import { AppEnvironment, env } from '@apillon/lib';

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
    configDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.CONFIG_MYSQL_DATABASE_TEST
        : env.CONFIG_MYSQL_DATABASE,
    authDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.AUTH_API_MYSQL_DATABASE_TEST
        : env.AUTH_API_MYSQL_DATABASE,
    socialDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.SOCIAL_MYSQL_DATABASE_TEST
        : env.SOCIAL_MYSQL_DATABASE,
    computeDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.COMPUTING_MYSQL_DATABASE_TEST
        : env.COMPUTING_MYSQL_DATABASE,
    accessDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.ACCESS_MYSQL_DATABASE_TEST
        : env.ACCESS_MYSQL_DATABASE,
    referralDb:
      env.APP_ENV === AppEnvironment.TEST
        ? env.REFERRAL_MYSQL_DATABASE_TEST
        : env.REFERRAL_MYSQL_DATABASE,
  };

  await queryFn(`

    CREATE OR REPLACE VIEW \`v_userStats\` AS
      SELECT
        email, user_uuid, COUNT(project_uuid) as project_count, JSON_ARRAYAGG(project_uuid) as project_uuids,
        IFNULL(SUM(sub_count), 0) as subscriptions , IFNULL(SUM(buy_count), 0) as buy_count, IFNULL(SUM(buy_amount), 0) as buy_amount, IFNULL(SUM(spend_count), 0) as spend_count, IFNULL(SUM(spend_amount), 0) as spend_amount,
        IFNULL(SUM(bucket_count), 0) as bucket_count, IFNULL(SUM(file_count), 0) as file_count, IFNULL(SUM(ipns_count), 0) as ipns_count, IFNULL(SUM(www_count), 0) as www_count, IFNULL(SUM(www_domain_count), 0) as www_domain_count,
        IFNULL(SUM(nft_count), 0) as nft_count, IFNULL(SUM(social_count), 0) as social_count, IFNULL(SUM(comp_count), 0) as comp_count, IFNULL(SUM(id_count), 0) as id_count,
        IFNULL(SUM(key_count), 0) as key_count, JSON_ARRAYAGG(apiKeys) as apiKeys, IFNULL(SUM(coworker_count), 0) as coworker_count,
        IFNULL(SUM(referral_count), 0) as referral_count, JSON_ARRAYAGG(referrals) as referrals, JSON_ARRAYAGG(domains) as domains
      FROM (
        SELECT DISTINCT
          u.email, u.user_uuid, p.project_uuid,
          sub_count , buy_count, buy_amount, spend_count, spend_amount,
          bucket_count, file_count, ipns_count, www_count, www_domain_count,
          nft_count, social_count, comp_count, id_count,
          key_count, apiKeys, coworker_count, referral_count, referrals, domains
        FROM ${databases.consoleApiDb}.user u
        LEFT JOIN ${databases.consoleApiDb}.project_user pu
          ON pu.user_id = u.id
          AND pu.role_id = 10
        LEFT JOIN ${databases.consoleApiDb}.project p
          ON p.id = pu.project_id
        LEFT JOIN (
          SELECT COUNT(*) as bucket_count, project_uuid
          FROM ${databases.storageDb}.bucket
          WHERE bucketType = 1
          AND status = 5
          GROUP BY project_uuid
        ) as b
        ON b.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as file_count, f.project_uuid
          FROM ${databases.storageDb}.file f
          JOIN ${databases.storageDb}.bucket b
          ON b.id = f.bucket_id
          WHERE b.bucketType = 1
          AND f.status = 5
          GROUP BY f.project_uuid
        ) as f
        ON f.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as ipns_count, project_uuid
          FROM ${databases.storageDb}.ipns
          WHERE status = 5
          GROUP BY project_uuid
        ) as ipns
        ON ipns.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as www_count, SUM(IF(IFNULL(domain, '') <> '', 1, 0)) as www_domain_count,
          JSON_ARRAYAGG(w.domain) as domains, project_uuid
          FROM ${databases.storageDb}.website w
          WHERE status = 5
          GROUP BY project_uuid
        ) as www
        ON www.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as nft_count, project_uuid
          FROM ${databases.nftsDb}.collection
          WHERE status = 5
          AND collectionStatus = 3
          GROUP BY project_uuid
        ) as nft
        ON nft.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as sub_count, project_uuid
          FROM ${databases.configDb}.subscription
          WHERE status = 5
          AND expiresOn > NOW()
          GROUP BY project_uuid
        ) as subs
        ON subs.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT
            SUM(IF(direction = 1 AND product_id IS null AND referenceTable = 'invoice', 1, 0)) as buy_count,
            SUM(IF(direction = 1 AND product_id IS null, amount, 0)) as buy_amount,
            SUM(IF(direction = 2, 1, 0)) as spend_count,
            SUM(IF(direction = 2, amount, 0)) as spend_amount, project_uuid
          FROM ${databases.configDb}.creditTransaction
          where referenceTable NOT IN ('project', 'promo_code', 'manually_added')
          GROUP BY project_uuid
        ) as trans
        ON trans.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as social_count, project_uuid
          FROM ${databases.socialDb}.space
          WHERE status = 5
          GROUP BY project_uuid
        ) as social
        ON social.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as comp_count, project_uuid
          FROM ${databases.computeDb}.contract
          WHERE contractStatus = 3
          GROUP BY project_uuid
        ) as comp
        ON comp.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as id_count, email
          FROM ${databases.authDb}.identity
          WHERE state = 'attested'
          GROUP BY email
        ) as id
        ON id.email = u.email
        LEFT JOIN (
          SELECT COUNT(*) as key_count, JSON_ARRAYAGG(apiKey) as apiKeys, project_uuid
          FROM ${databases.accessDb}.apiKey
          WHERE status = 5
          GROUP BY project_uuid
        ) as apikey
        ON apikey.project_uuid = p.project_uuid
        LEFT JOIN (
          SELECT COUNT(*) as coworker_count, project_id
          FROM ${databases.consoleApiDb}.project_user
          WHERE role_id <> 10
          AND status = 5
          GROUP BY project_id
        ) as coworker
        ON coworker.project_id = p.id
        LEFT JOIN (
          SELECT COUNT(*) as referral_count, JSON_ARRAYAGG(usr.user_uuid) as referrals, inviter.user_uuid
          FROM ${databases.referralDb}.player usr
          JOIN ${databases.referralDb}.player inviter
          ON usr.referrer_id = inviter.id
          GROUP BY inviter.user_uuid
        ) as ref
        ON ref.user_uuid = u.user_uuid
        WHERE u.status = 5
      ) AS T
      GROUP BY email, user_uuid
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP VIEW IF EXISTS \`v_userStats\`;
  `);
}
