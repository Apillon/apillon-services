import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.COMPUTING_MYSQL_DATABASE,
    host: env.COMPUTING_MYSQL_HOST,
    port: env.COMPUTING_MYSQL_PORT,
    user: env.COMPUTING_MYSQL_DEPLOY_USER || env.COMPUTING_MYSQL_USER,
    password:
      env.COMPUTING_MYSQL_DEPLOY_PASSWORD || env.COMPUTING_MYSQL_PASSWORD,
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
