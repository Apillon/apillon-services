import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.DEPLOY_MYSQL_DATABASE,
    host: env.DEPLOY_MYSQL_HOST,
    port: env.DEPLOY_MYSQL_PORT,
    user: env.DEPLOY_MYSQL_DEPLOY_USER || env.DEPLOY_MYSQL_USER,
    password: env.DEPLOY_MYSQL_DEPLOY_PASSWORD || env.DEPLOY_MYSQL_PASSWORD,
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
