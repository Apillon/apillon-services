import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.ACCESS_MYSQL_DATABASE,
    host: env.ACCESS_MYSQL_HOST,
    port: env.ACCESS_MYSQL_PORT,
    user: env.ACCESS_MYSQL_USER,
    password: env.ACCESS_MYSQL_PASSWORD,
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
