import { Mongo, MySql, SqlModelStatus, env } from '@apillon/lib';
import { AirdropTask } from '../../modules/airdrop/models/airdrop-task.model';

async function setupDatabases() {
  const devConsoleSql = new MySql({
    host: env.DEV_CONSOLE_API_MYSQL_HOST,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
    port: env.DEV_CONSOLE_API_MYSQL_PORT,
    user: env.DEV_CONSOLE_API_MYSQL_USER,
  });
  await devConsoleSql.connect();

  const amsSql = new MySql({
    host: env.ACCESS_MYSQL_HOST,
    database: env.ACCESS_MYSQL_DATABASE,
    password: env.ACCESS_MYSQL_PASSWORD,
    port: env.ACCESS_MYSQL_PORT,
    user: env.ACCESS_MYSQL_USER,
  });
  await amsSql.connect();

  const lmasMongo = new Mongo(
    env.MONITORING_MONGO_SRV,
    env.MONITORING_MONGO_DATABASE,
    10,
  );
  await lmasMongo.connect();

  const storageSql = new MySql({
    host: env.STORAGE_MYSQL_HOST,
    database: env.STORAGE_MYSQL_DATABASE,
    password: env.STORAGE_MYSQL_PASSWORD,
    port: env.STORAGE_MYSQL_PORT,
    user: env.STORAGE_MYSQL_USER,
  });
  await storageSql.connect();

  const configSql = new MySql({
    host: env.CONFIG_MYSQL_HOST,
    database: env.CONFIG_MYSQL_DATABASE,
    password: env.CONFIG_MYSQL_PASSWORD,
    port: env.CONFIG_MYSQL_PORT,
    user: env.CONFIG_MYSQL_USER,
  });
  await configSql.connect();

  const referralSql = new MySql({
    host: env.REFERRAL_MYSQL_HOST,
    database: env.REFERRAL_MYSQL_DATABASE,
    password: env.REFERRAL_MYSQL_PASSWORD,
    port: env.REFERRAL_MYSQL_PORT,
    user: env.REFERRAL_MYSQL_USER,
  });
  await referralSql.connect();

  const nftsSql = new MySql({
    host: env.NFTS_MYSQL_HOST,
    database: env.NFTS_MYSQL_DATABASE,
    password: env.NFTS_MYSQL_PASSWORD,
    port: env.NFTS_MYSQL_PORT,
    user: env.NFTS_MYSQL_USER,
  });
  await nftsSql.connect();

  const blockchainSql = new MySql({
    host: env.BLOCKCHAIN_MYSQL_HOST,
    database: env.BLOCKCHAIN_MYSQL_DATABASE,
    password: env.BLOCKCHAIN_MYSQL_PASSWORD,
    port: env.BLOCKCHAIN_MYSQL_PORT,
    user: env.BLOCKCHAIN_MYSQL_USER,
  });
  await blockchainSql.connect();

  const socialSql = new MySql({
    host: env.SOCIAL_MYSQL_HOST,
    database: env.SOCIAL_MYSQL_DATABASE,
    password: env.SOCIAL_MYSQL_PASSWORD,
    port: env.SOCIAL_MYSQL_PORT,
    user: env.SOCIAL_MYSQL_USER,
  });
  await socialSql.connect();

  const computingSql = new MySql({
    host: env.COMPUTING_MYSQL_HOST,
    database: env.COMPUTING_MYSQL_DATABASE,
    password: env.COMPUTING_MYSQL_PASSWORD,
    port: env.COMPUTING_MYSQL_PORT,
    user: env.COMPUTING_MYSQL_USER,
  });
  await computingSql.connect();

  return {
    devConsoleSql,
    amsSql,
    lmasMongo,
    storageSql,
    configSql,
    referralSql,
    nftsSql,
    blockchainSql,
    socialSql,
    computingSql,
  };
}

enum NCTRAction {
  PROJECT_CREATED = 'project_created',
  BUCKET_CREATED = 'bucket_created',
  FILE_UPLOADED = 'file_uploaded_to_ipfs',
  REFERRED_FRIEND = 'referred_friend',
  WEBSITE_CREATED = 'hosting_page_created',
  DOMAIN_LINKED = 'domain_linked',
  NFT_CREATED = 'nft_collection_deployed',
  SUBSCRIPTION_PLAN = 'subscription_plan',
  BOUGHT_CREDITS = 'bought_credits',
  SPENT_CREDITS = 'spent_credits',
  SPACE_CREATED = 'chat_integration',
  SCHRODINGERS_DEPLOY = 'schrodingers_deploy',
  API_CALL = 'api_call',
}

const pointsMapping: { [key in NCTRAction]: number } = {
  [NCTRAction.PROJECT_CREATED]: 1,
  [NCTRAction.BUCKET_CREATED]: 1,
  [NCTRAction.FILE_UPLOADED]: 1,
  [NCTRAction.API_CALL]: 10,
  [NCTRAction.REFERRED_FRIEND]: 2,
  [NCTRAction.WEBSITE_CREATED]: 1,
  [NCTRAction.DOMAIN_LINKED]: 10,
  [NCTRAction.SUBSCRIPTION_PLAN]: 20,
  [NCTRAction.BOUGHT_CREDITS]: 5,
  [NCTRAction.SPENT_CREDITS]: 1,
  [NCTRAction.SPACE_CREATED]: 1,
  [NCTRAction.SCHRODINGERS_DEPLOY]: 1,
  [NCTRAction.NFT_CREATED]: 1,
};

let projects: any[];
let buckets: any[];
let files: any[];
let ipns: any[];
let referrals: any[];
let websites: any[];
let nfts: any[];
let subscriptions: any[];
let creditTransactions: any[];
let spaces: any[];
let computingContracts: any[];

async function main() {
  const databases = await setupDatabases();
  const users = await databases.devConsoleSql.paramExecute(
    `SELECT * FROM user WHERE status = ${SqlModelStatus.ACTIVE} AND user_uuid = '00f147dd-b502-40d4-abeb-c4ed73c7b783'`,
  );
  projects = await databases.devConsoleSql.paramExecute(
    `SELECT * FROM project WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  buckets = await databases.storageSql.paramExecute(
    `SELECT * FROM bucket WHERE bucketType = 1 AND status = ${SqlModelStatus.ACTIVE}`,
  );
  files = await databases.storageSql.paramExecute(
    `SELECT * FROM file WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  ipns = await databases.storageSql.paramExecute(
    `SELECT * FROM ipns WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  websites = await databases.storageSql.paramExecute(
    `SELECT * FROM website WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  nfts = await databases.nftsSql.paramExecute(
    `SELECT * FROM collection WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  subscriptions = await databases.configSql.paramExecute(
    `
    SELECT * FROM subscription WHERE expiresOn > NOW()
    AND status = ${SqlModelStatus.ACTIVE}
    `,
  );
  creditTransactions = await databases.configSql.paramExecute(
    `SELECT * FROM creditTransaction`,
  );
  spaces = await databases.socialSql.paramExecute(`SELECT * FROM space`);
  computingContracts = await databases.computingSql.paramExecute(
    `SELECT * FROM contract`,
  );

  const pts = await calculateUserPoints(users[0] as any);
  console.log(pts);
}

async function calculateUserPoints(user: any) {
  const userProjects = projects.filter((p) => p.createUser === user.id);
  if (!userProjects.length) {
    return;
  }
  const airdropTasks = new AirdropTask({
    user_uuid: user.user_uuid,
    projectCreated: true,
  });
  const projectUuids = userProjects.map((p) => p.project_uuid);

  const userBuckets = buckets.filter((p) =>
    projectUuids.includes(p.project_uuid),
  );

  airdropTasks.bucketCreated = userBuckets.length > 0;

  airdropTasks.fileUploaded =
    files.filter((p) => userBuckets.map((b) => b.id).includes(p.bucket_id))
      .length > 0;

  airdropTasks.ipnsCreated =
    ipns.filter((p) => projectUuids.includes(p.project_uuid)).length > 0;

  const userWebsites = websites.filter((p) =>
    projectUuids.includes(p.project_uuid),
  );
  airdropTasks.websiteCreated = userWebsites.length > 0;

  airdropTasks.domainLinked = userWebsites.filter((w) => !!w.domain).length > 0;

  airdropTasks.nftCollectionCreated =
    nfts.filter((p) => projectUuids.includes(p.project_uuid)).length > 0;

  airdropTasks.onSubscriptionPlan =
    subscriptions.filter((p) => projectUuids.includes(p.project_uuid)).length >
    0;

  airdropTasks.creditsPurchased =
    creditTransactions.filter(
      (p) =>
        projectUuids.includes(p.project_uuid) &&
        p.direction === 1 &&
        p.referenceTable === 'invoice',
    ).length > 0;

  airdropTasks.creditsSpent = creditTransactions
    .filter((p) => projectUuids.includes(p.project_uuid) && p.direction === 2)
    .reduce((a, b) => a.amount + b.amount, 0);

  airdropTasks.grillChatCreated =
    spaces.filter((p) => projectUuids.includes(p.project_uuid)).length > 0;

  airdropTasks.computingContractCreated =
    computingContracts.filter((p) => projectUuids.includes(p.project_uuid))
      .length > 0;
}

main();
