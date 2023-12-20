import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.SUBSOCIAL_MYSQL_DATABASE,
    host: env.SUBSOCIAL_MYSQL_HOST,
    port: env.SUBSOCIAL_MYSQL_PORT,
    user: env.SUBSOCIAL_MYSQL_DEPLOY_USER || env.SUBSOCIAL_MYSQL_USER,
    password:
      env.SUBSOCIAL_MYSQL_DEPLOY_PASSWORD || env.SUBSOCIAL_MYSQL_PASSWORD,
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
