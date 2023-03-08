import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.AUTH_API_MYSQL_DATABASE,
    host: env.AUTH_API_MYSQL_HOST,
    port: env.AUTH_API_MYSQL_PORT,
    user: env.AUTH_API_MYSQL_DEPLOY_USER || env.AUTH_API_MYSQL_USER,
    password: env.AUTH_API_MYSQL_DEPLOY_PASSWORD || env.AUTH_API_MYSQL_PASSWORD,
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
