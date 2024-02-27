import { Mongo, MySql, env } from '@apillon/lib';
import { UserAirdropTask } from '../../modules/airdrop/models/user-airdrop-task.model';
import { ServiceContext } from '@apillon/service-lib';
import { UserStats } from '../../modules/airdrop/models/user-stats';

let context: ServiceContext;
let mongo: Mongo;
let sql: MySql;

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
  await airdropTasks.assignUserAirdropTasks(stat);

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

  await airdropTasks.assignReferredUsers(referrals);
  airdropTasks.recalculateTotalPoints();
  await airdropTasks.insertOrUpdate();
}

void main();
