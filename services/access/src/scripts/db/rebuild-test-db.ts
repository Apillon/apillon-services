import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.ACCESS_MYSQL_DATABASE_TEST,
    host: env.ACCESS_MYSQL_HOST_TEST,
    port: env.ACCESS_MYSQL_PORT_TEST,
    user: env.ACCESS_MYSQL_USER_TEST,
    password: env.ACCESS_MYSQL_PASSWORD_TEST,
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
