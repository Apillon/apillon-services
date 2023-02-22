import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
    host: env.DEV_CONSOLE_API_MYSQL_HOST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT,
    user: env.DEV_CONSOLE_API_MYSQL_USER,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
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
