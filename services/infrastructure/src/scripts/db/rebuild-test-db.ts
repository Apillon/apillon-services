import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.INFRASTRUCTURE_MYSQL_DATABASE_TEST,
    host: env.INFRASTRUCTURE_MYSQL_HOST_TEST,
    port: env.INFRASTRUCTURE_MYSQL_PORT_TEST,
    user: env.INFRASTRUCTURE_MYSQL_USER_TEST,
    password: env.INFRASTRUCTURE_MYSQL_PASSWORD_TEST,
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
