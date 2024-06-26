import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.CONTRACTS_MYSQL_DATABASE,
    host: env.CONTRACTS_MYSQL_HOST,
    port: env.CONTRACTS_MYSQL_PORT,
    user: env.CONTRACTS_MYSQL_DEPLOY_USER || env.CONTRACTS_MYSQL_USER,
    password:
      env.CONTRACTS_MYSQL_DEPLOY_PASSWORD || env.CONTRACTS_MYSQL_PASSWORD,
  });

  const showDialog = !process.argv.includes('--F');
  await migrator.seed(showDialog);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
