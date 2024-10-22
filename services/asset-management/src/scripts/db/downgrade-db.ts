import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.ASSET_MANAGEMENT_MYSQL_DATABASE,
    host: env.ASSET_MANAGEMENT_MYSQL_HOST,
    port: env.ASSET_MANAGEMENT_MYSQL_PORT,
    user:
      env.ASSET_MANAGEMENT_MYSQL_DEPLOY_USER || env.ASSET_MANAGEMENT_MYSQL_USER,
    password:
      env.ASSET_MANAGEMENT_MYSQL_DEPLOY_PASSWORD ||
      env.ASSET_MANAGEMENT_MYSQL_PASSWORD,
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
