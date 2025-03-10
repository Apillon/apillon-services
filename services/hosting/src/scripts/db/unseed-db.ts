import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.HOSTING_MYSQL_DATABASE,
    host: env.HOSTING_MYSQL_HOST,
    port: env.HOSTING_MYSQL_PORT,
    user: env.HOSTING_MYSQL_DEPLOY_USER || env.HOSTING_MYSQL_USER,
    password: env.HOSTING_MYSQL_DEPLOY_PASSWORD || env.HOSTING_MYSQL_PASSWORD,
  });

  const showDialog = !process.argv.includes('--F');
  await migrator.unseed(showDialog);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
