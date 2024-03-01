import { MySql, env, runWithWorkers } from '@apillon/lib';
import { UserAirdropTask } from '../../modules/airdrop/models/user-airdrop-task.model';
import { ServiceContext } from '@apillon/service-lib';

let context: ServiceContext;
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

  context = new ServiceContext();
  context.setMySql(sql);
}

async function main() {
  await setupDatabases();
  const userStats = await sql.paramExecute(`SELECT * FROM v_userStats`);

  await runWithWorkers(userStats, 100, context, async (stat, ctx) => {
    const task = new UserAirdropTask({}, ctx);
    await task.getNewStats(stat.user_uuid);
  });

  await sql.close();

  console.info('Finished assigning airdrop tasks');
}

void main();
