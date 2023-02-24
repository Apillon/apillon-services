import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.STORAGE_MYSQL_DATABASE,
    host: env.STORAGE_MYSQL_HOST,
    port: env.STORAGE_MYSQL_PORT,
    user: env.STORAGE_MYSQL_DEPLOY_USER,
    password: env.STORAGE_MYSQL_DEPLOY_PASSWORD,
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
