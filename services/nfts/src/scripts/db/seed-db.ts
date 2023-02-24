import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.NFTS_MYSQL_DATABASE,
    host: env.NFTS_MYSQL_HOST,
    port: env.NFTS_MYSQL_PORT,
    user: env.NFTS_MYSQL_DEPLOY_USER,
    password: env.NFTS_MYSQL_DEPLOY_PASSWORD,
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
