import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.REFERRAL_MYSQL_DATABASE,
    host: env.REFERRAL_MYSQL_HOST,
    port: env.REFERRAL_MYSQL_PORT,
    user: env.REFERRAL_MYSQL_DEPLOY_USER,
    password: env.REFERRAL_MYSQL_DEPLOY_PASSWORD,
  });

  const showDialog = !process.argv.includes('--F');
  await migrator.downgrade(showDialog);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
