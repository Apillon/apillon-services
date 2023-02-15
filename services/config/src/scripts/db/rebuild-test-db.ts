import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.CONFIG_MYSQL_DATABASE_TEST,
    host: env.CONFIG_MYSQL_HOST_TEST,
    port: env.CONFIG_MYSQL_PORT_TEST,
    user: env.CONFIG_MYSQL_USER_TEST,
    password: env.CONFIG_MYSQL_PASSWORD_TEST,
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
