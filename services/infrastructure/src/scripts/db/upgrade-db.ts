import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.INFRASTRUCTURE_MYSQL_DATABASE,
    host: env.INFRASTRUCTURE_MYSQL_HOST,
    port: env.INFRASTRUCTURE_MYSQL_PORT,
    user: env.INFRASTRUCTURE_MYSQL_DEPLOY_USER || env.INFRASTRUCTURE_MYSQL_USER,
    password:
      env.INFRASTRUCTURE_MYSQL_DEPLOY_PASSWORD ||
      env.INFRASTRUCTURE_MYSQL_PASSWORD,
  });

  const showDialog = !process.argv.includes('--F');
  await migrator.upgrade(showDialog);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
