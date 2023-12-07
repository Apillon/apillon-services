import {
  DefaultUserRole,
  MySql,
  SqlModelStatus,
  env,
  getEnvSecrets,
} from '@apillon/lib';
import { DbTables } from '../../config/types';
import { setMailerliteField } from '../../modules/user/utils/mailing-utils';

/*
 * Script used for populating mailerlite field backwards
 * Populates fields which indicates which mailerlite subscribers have projects, buckets, nfts or websites
 * All projects and buckets are fetched from the database and data is sent to mailerlite based on the project owner's email address
 * Note this is only ran once, for all future subscribers there is an automation to set the fields when new projects and buckets are created.
 */

let devConsoleSql: MySql;
let storageSql: MySql;
// Copied from storage
enum BucketType {
  STORAGE = 1,
  HOSTING = 2,
  NFT_METADATA = 3,
}
const projectOwnerEmailMap: Record<string, string> = {};

async function initializeDb() {
  await getEnvSecrets();
  devConsoleSql = new MySql({
    host: env.DEV_CONSOLE_API_MYSQL_HOST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
    user: env.DEV_CONSOLE_API_MYSQL_USER,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
  });
  await devConsoleSql.connect();

  storageSql = new MySql({
    host: env.STORAGE_MYSQL_HOST,
    port: env.STORAGE_MYSQL_PORT,
    database: env.STORAGE_MYSQL_DATABASE,
    user: env.STORAGE_MYSQL_USER,
    password: env.STORAGE_MYSQL_PASSWORD,
  });
  await storageSql.connect();
}

async function populateMailerliteProjectFields() {
  const allProjects = await devConsoleSql.paramExecute(
    `SELECT * FROM \`${DbTables.PROJECT}\` WHERE \`status\` = ${SqlModelStatus.ACTIVE}`,
  );

  for (const project of allProjects) {
    const email = projectOwnerEmailMap[project.project_uuid];
    if (!email) {
      continue;
    }
    await setMailerliteField(email, 'project_owner', true);
    // wait for 1000s to avoid rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function populateMailerliteBucketFields() {
  const allBuckets = await storageSql.paramExecute(
    `
    SELECT project_uuid, bucketType FROM \`bucket\`
    WHERE \`status\` = ${SqlModelStatus.ACTIVE}
    GROUP BY project_uuid, bucketType;
    `,
  );

  for (const bucket of allBuckets) {
    const email = projectOwnerEmailMap[bucket.project_uuid];
    if (!email) {
      continue;
    }
    const typeFieldMap = {
      [BucketType.STORAGE]: 'has_bucket',
      [BucketType.HOSTING]: 'has_website',
      [BucketType.NFT_METADATA]: 'has_nft',
    };

    await setMailerliteField(email, typeFieldMap[bucket.bucketType], true);
    // wait for 1s to avoid rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function mapProjectOwnerEmails() {
  const results = await devConsoleSql.paramExecute(
    `
    SELECT p.project_uuid, u.email
    FROM \`${DbTables.PROJECT}\` p
    JOIN \`${DbTables.PROJECT_USER}\` pu ON p.id = pu.project_id
    JOIN \`${DbTables.USER}\` u ON pu.user_id = u.id
    WHERE role_id = @role_id
    AND p.status <> ${SqlModelStatus.DELETED}
    `,
    { role_id: DefaultUserRole.PROJECT_OWNER },
  );

  results.forEach((row: { project_uuid: string; email: string }) => {
    projectOwnerEmailMap[row.project_uuid] = row.email;
  });
  return projectOwnerEmailMap;
}

void initializeDb()
  .then(mapProjectOwnerEmails)
  .then(populateMailerliteProjectFields)
  .then(populateMailerliteBucketFields);
