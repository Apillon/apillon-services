import {
  Mongo,
  MongoCollections,
  MySql,
  SerializeFor,
  SqlModelStatus,
  env,
} from '@apillon/lib';
import { UserAirdropTask } from '../../modules/airdrop/models/user-airdrop-task.model';
import { ServiceContext } from '@apillon/service-lib';
import { Player } from '../../modules/referral/models/player.model';
import { DbTables } from '../../config/types';

let context: ServiceContext;
let mongo: Mongo;
let sql: MySql;

interface UserStats {
  email: string;
  user_uuid: string;
  project_count: number;
  project_uuids: string[];
  subscriptions: number;
  buy_count: number;
  buy_amount: number;
  spend_count: number;
  spend_amount: number;
  bucket_count: number;
  file_count: number;
  ipns_count: number;
  www_count: number;
  www_domain_count: number;
  nft_count: number;
  social_count: number;
  comp_count: number;
  id_count: number;
  key_count: number;
  apiKeys: string[][];
  coworker_count: number;
  referral_count: number;
  referrals: string[][];
}

async function setupDatabases() {
  sql = new MySql({
    host: env.REFERRAL_MYSQL_HOST,
    database: env.REFERRAL_MYSQL_DATABASE,
    password: env.REFERRAL_MYSQL_PASSWORD,
    port: env.REFERRAL_MYSQL_PORT,
    user: env.REFERRAL_MYSQL_USER,
  });
  await sql.connect();

  mongo = new Mongo(
    env.MONITORING_MONGO_SRV,
    env.MONITORING_MONGO_DATABASE,
    10,
  );
  await mongo.connect();

  context = new ServiceContext();
  context.setMySql(sql);
}

async function main() {
  await setupDatabases();
  const userStats = await sql.paramExecute(`SELECT * FROM v_userStats`);

  await Promise.all(
    userStats.map((stat: UserStats) => assignUserAirdropTasks(stat)),
  );

  await Promise.all(
    userStats.map((stat: UserStats) =>
      assignReferredUsers(
        stat.user_uuid,
        stat.referrals.join(',').split(','),
        context,
      ),
    ),
  );

  console.info('Finished assigning airdrop tasks');
}

async function assignUserAirdropTasks(stat: UserStats): Promise<void> {
  const user_uuid: string = stat.user_uuid;

  const airdropTasks = new UserAirdropTask({ user_uuid }, context);

  if (!stat.project_count) {
    airdropTasks.recalculateTotalPoints();
    await airdropTasks.insertOrUpdate();
    return;
  }

  // Populate tasks for user based on their data in the database
  // from each of their projects
  airdropTasks.populate({
    projectCreated: true,
    bucketCreated: stat.bucket_count > 0,
    fileUploaded: stat.file_count > 0,
    ipnsCreated: stat.ipns_count > 0,
    websiteCreated: stat.www_count > 0,
    domainLinked: stat.www_domain_count > 0,
    nftCollectionCreated: stat.nft_count > 0,
    onSubscriptionPlan: stat.subscriptions > 0,
    grillChatCreated: stat.social_count > 0,
    computingContractCreated: stat.comp_count > 0,
    kiltIdentityCreated: stat.id_count > 0,
    collaboratorAdded: stat.coworker_count > 0,
    creditsPurchased: stat.buy_count > 0,
    creditsSpent: stat.spend_amount,
    userReferred: 0,
    ...(await assignApiTasks(stat.apiKeys.join(',').split(','))),
  });

  airdropTasks.recalculateTotalPoints();
  await airdropTasks.insertOrUpdate();
}

// Add total points based on users they have referred which meet totalPoints criteria
async function assignReferredUsers(
  user_uuid: string,
  referrals: string[],
  context: ServiceContext,
) {
  if (!referrals?.length) {
    return;
  }

  const airdropTasks = await new UserAirdropTask(
    {},
    context,
  ).populateByUserUuid(user_uuid);

  const res = await context.mysql.paramExecute(
    `
    SELECT count(*) as cnt 
    FROM ${DbTables.USER_AIRDROP_TASK}
    WHERE user_uuid IN (@referrals)
    AND totalPoints >= 15
  `,
    referrals,
  );

  airdropTasks.usersReferred = res[0]?.cnt || 0;
  airdropTasks.recalculateTotalPoints();
  await airdropTasks.insertOrUpdate();
}

// Assign tasks which are checked on mongoDB (API calls)
async function assignApiTasks(apiKeys: any[]) {
  const collection = mongo.db.collection(MongoCollections.API_REQUEST_LOGS);

  const checkApiCalled = ($regex: RegExp) =>
    collection
      .count({ apiKey: { $in: apiKeys }, url: { $regex, $options: 'i' } })
      .then((c) => c > 0);

  return {
    websiteUploadedViaApi: await checkApiCalled(/^\/hosting.*upload/),
    identitySdkUsed: await checkApiCalled(/^\/wallet-identity.*$/),
    fileUploadedViaApi: await checkApiCalled(/^\/storage\/buckets.*upload/),
    nftMintedApi: await checkApiCalled(/^\/nfts\/collections.*mint/),
  };
}

// TODO: Remove and create worker
void main();
