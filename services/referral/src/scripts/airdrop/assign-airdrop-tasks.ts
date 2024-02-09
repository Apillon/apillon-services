import { Mongo, MySql, SqlModelStatus, env } from '@apillon/lib';
import { AirdropTask } from '../../modules/airdrop/models/airdrop-task.model';
import { ServiceContext } from '@apillon/service-lib';

let referralContext: ServiceContext;

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

  const authSql = new MySql({
    host: env.AUTH_API_MYSQL_HOST,
    database: env.AUTH_API_MYSQL_DATABASE,
    password: env.AUTH_API_MYSQL_PASSWORD,
    port: env.AUTH_API_MYSQL_PORT,
    user: env.AUTH_API_MYSQL_USER,
  });
  await authSql.connect();

  referralContext = new ServiceContext();
  referralContext.setMySql(referralSql);

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
    authSql,
    referralContext,
  };
}

let projects: any[];
let projectUsers: any[];
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
let identities: any[];

async function main() {
  const databases = await setupDatabases();
  const users = await databases.devConsoleSql.paramExecute(
    `SELECT * FROM user WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  projects = await databases.devConsoleSql.paramExecute(
    `SELECT * FROM project WHERE status = ${SqlModelStatus.ACTIVE}`,
  );
  projectUsers = await databases.devConsoleSql.paramExecute(
    `SELECT * FROM project_user WHERE status = ${SqlModelStatus.ACTIVE}`,
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
    `SELECT * FROM collection WHERE collectionStatus = 3 AND status = ${SqlModelStatus.ACTIVE}`,
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
  identities = await databases.authSql.paramExecute(
    `SELECT * FROM identity WHERE state = 'attested' AND status = ${SqlModelStatus.ACTIVE}`,
  );

  await Promise.all(users.map((user) => assignAirdropTasks(user)));
  console.info('Finished assigning airdrop tasks');
}

async function assignAirdropTasks(user: any): Promise<void> {
  const userProjects = projects.filter((p) => p.createUser === user.id);
  if (!userProjects.length) {
    return;
  }
  const user_uuid: string = user.user_uuid;
  const airdropTasks = new AirdropTask(
    { user_uuid, projectCreated: true },
    referralContext,
  );
  const projectUuids = userProjects.map((p) => p.project_uuid);
  const projectIds = userProjects.map((p) => p.id);

  const own: (collection: any[]) => any[] = (collection: any[]) =>
    collection.filter((p) => projectUuids.includes(p.project_uuid));
  const ownAny: (collection: any[]) => boolean = (collection: any[]) =>
    own(collection).length > 0;

  airdropTasks.populate({
    collaboratorAdded:
      projectUsers.filter((p) => projectIds.includes(p.project_id)).length > 1,
    bucketCreated: ownAny(buckets),
    fileUploaded: ownAny(files),
    ipnsCreated: ownAny(ipns),
    websiteCreated: ownAny(websites),
    domainLinked: ownAny(websites.filter((w) => !!w.domain)),
    nftCollectionCreated: ownAny(nfts),
    onSubscriptionPlan: ownAny(subscriptions),
    grillChatCreated: ownAny(spaces),
    computingContractCreated: ownAny(computingContracts),
    kiltIdentityCreated: ownAny(identities),
    creditsPurchased:
      own(creditTransactions).filter(
        (p) => p.direction == 1 && p.referenceTable === 'invoice',
      ).length > 0,
    creditsSpent: own(creditTransactions)
      .filter((p) => p.direction == 2)
      .reduce((total, current) => total + current.amount, 0),
  });

  await airdropTasks.saveOrUpdate();
  console.info(`Assigned airdrop tasks for user ${user_uuid}`);
}

main();
