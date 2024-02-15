import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.SOCIAL_MYSQL_DATABASE,
    host: env.SOCIAL_MYSQL_HOST,
    port: env.SOCIAL_MYSQL_PORT,
    user: env.SOCIAL_MYSQL_DEPLOY_USER || env.SOCIAL_MYSQL_USER,
    password: env.SOCIAL_MYSQL_DEPLOY_PASSWORD || env.SOCIAL_MYSQL_PASSWORD,
  });

  const showDialog = !process.argv.includes('--F');
  await migrator.rebuild(showDialog);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
