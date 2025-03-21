import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.SIMPLETS_MYSQL_DATABASE,
    host: env.SIMPLETS_MYSQL_HOST,
    port: env.SIMPLETS_MYSQL_PORT,
    user: env.SIMPLETS_MYSQL_DEPLOY_USER || env.SIMPLETS_MYSQL_USER,
    password: env.SIMPLETS_MYSQL_DEPLOY_PASSWORD || env.SIMPLETS_MYSQL_PASSWORD,
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
