import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.MAILING_MYSQL_DATABASE,
    host: env.MAILING_MYSQL_HOST,
    port: env.MAILING_MYSQL_PORT,
    user: env.MAILING_MYSQL_DEPLOY_USER || env.MAILING_MYSQL_USER,
    password: env.MAILING_MYSQL_DEPLOY_PASSWORD || env.MAILING_MYSQL_PASSWORD,
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
