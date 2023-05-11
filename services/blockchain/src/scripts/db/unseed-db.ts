import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.BLOCKCHAIN_MYSQL_DATABASE,
    host: env.BLOCKCHAIN_MYSQL_HOST,
    port: env.BLOCKCHAIN_MYSQL_PORT,
    user: env.BLOCKCHAIN_MYSQL_DEPLOY_USER || env.BLOCKCHAIN_MYSQL_USER,
    password:
      env.BLOCKCHAIN_MYSQL_DEPLOY_PASSWORD || env.BLOCKCHAIN_MYSQL_PASSWORD,
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
