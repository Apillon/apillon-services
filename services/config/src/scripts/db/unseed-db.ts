import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.CONFIG_MYSQL_DATABASE,
    host: env.CONFIG_MYSQL_HOST,
    port: env.CONFIG_MYSQL_PORT,
    user: env.CONFIG_MYSQL_DEPLOY_USER,
    password: env.CONFIG_MYSQL_DEPLOY_PASSWORD,
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
