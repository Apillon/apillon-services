import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.AUTH_API_MYSQL_DATABASE_TEST,
    host: env.AUTH_API_MYSQL_HOST_TEST,
    port: env.AUTH_API_MYSQL_PORT_TEST,
    user: env.AUTH_API_MYSQL_USER_TEST,
    password: env.AUTH_API_MYSQL_PASSWORD_TEST,
  });

  await migrator.rebuild(false);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
