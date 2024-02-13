import { Mongo, MySql, SerializeFor, SqlModelStatus, env } from '@apillon/lib';
import { AirdropTask } from '../../modules/airdrop/models/airdrop-task.model';
import { ServiceContext } from '@apillon/service-lib';
import { Player } from '../../modules/referral/models/player.model';

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
let websites: any[];
let nfts: any[];
let subscriptions: any[];
let creditTransactions: any[];
let spaces: any[];
let computingContracts: any[];
let identities: any[];
// let referrals: any[];

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
  // referrals = await databases.referralSql.paramExecute(
  //   `SELECT * FROM ${DbTables.PLAYER}`,
  // );

  const userAirdropTasks = await Promise.all(
    users.map((user) => assignAirdropTasks(user)),
  );

  await Promise.all(
    users.map((user) => assignReferredUsers(user, userAirdropTasks)),
  );
  console.info('Finished assigning airdrop tasks');
}

async function assignAirdropTasks(user: any): Promise<AirdropTask> {
  const user_uuid: string = user.user_uuid;

  const airdropTasks = new AirdropTask(
    // Assign 10 points for registering
    { user_uuid, totalPoints: 10 },
    referralContext,
  );
  const userProjects = projects.filter((p) => p.createUser === user.id);
  if (!userProjects.length) {
    return await saveAirdropTasks(airdropTasks);
  }

  const projectUuids = userProjects.map((p) => p.project_uuid);
  const projectIds = userProjects.map((p) => p.id);

  const own: (collection: any[]) => any[] = (collection: any[]) =>
    collection.filter((p) => projectUuids.includes(p.project_uuid));
  const ownAny: (collection: any[]) => boolean = (collection: any[]) =>
    own(collection).length > 0;

  airdropTasks.populate({
    projectCreated: true,
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
    collaboratorAdded:
      projectUsers.filter((p) => projectIds.includes(p.project_id)).length > 1,
    creditsPurchased:
      own(creditTransactions).filter(
        (p) => p.direction == 1 && p.referenceTable === 'invoice',
      ).length > 0,
    creditsSpent: own(creditTransactions)
      .filter((p) => p.direction == 2)
      .reduce((total, current) => total + current.amount, 0),
  });

  for (const [task, isCompleted] of Object.entries(
    airdropTasks.serialize(SerializeFor.PROFILE),
  )) {
    if (task === 'creditsSpent') {
      airdropTasks.totalPoints += Math.floor(airdropTasks.creditsSpent / 3000);
    } else if (isCompleted) {
      airdropTasks.totalPoints += taskPoints[task] || 0;
    }
  }

  return await saveAirdropTasks(airdropTasks);
}

async function assignReferredUsers(user: any, airdropTasks: AirdropTask[]) {
  const referredUsers = await new Player({}, referralContext)
    .populateByUserUuid(user.user_uuid)
    .then((player) => player.getReferredUsers());
  const referrerAirdropTasks = airdropTasks.find(
    (u) => u.user_uuid === user.user_uuid,
  );
  for (const referredUser of referredUsers) {
    const referredAirdropTasks = airdropTasks.find(
      (u) => u.user_uuid === referredUser.user_uuid,
    );
    // Only count referred users if they have more than 15 points
    if (referredAirdropTasks?.totalPoints > 15) {
      referrerAirdropTasks.usersReferred += 1;
      referrerAirdropTasks.totalPoints += taskPoints['usersReferred'];
      await referrerAirdropTasks.saveOrUpdate();
    }
  }
}

async function saveAirdropTasks(airdropTasks: AirdropTask) {
  await airdropTasks.saveOrUpdate();
  console.info(`Assigned airdrop tasks for user ${airdropTasks.user_uuid}`);
  return airdropTasks;
}

// Define a mapping for tasks to points
const taskPoints = {
  projectCreated: 1,
  bucketCreated: 1,
  fileUploaded: 1,
  ipnsCreated: 1,
  websiteCreated: 1,
  domainLinked: 10,
  nftCollectionCreated: 10,
  onSubscriptionPlan: 20,
  creditsPurchased: 5,
  grillChatCreated: 1,
  computingContractCreated: 0,
  kiltIdentityCreated: 10,
  collaboratorAdded: 1,
  usersReferred: 2,
};

// TODO: Remove and create worker
void main();
