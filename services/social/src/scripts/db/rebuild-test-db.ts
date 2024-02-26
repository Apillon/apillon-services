import { env, getEnvSecrets, SqlMigrator } from '@apillon/lib';

async function run() {
  await getEnvSecrets();

  const migrator = new SqlMigrator({
    database: env.SOCIAL_MYSQL_DATABASE_TEST,
    host: env.SOCIAL_MYSQL_HOST_TEST,
    port: env.SOCIAL_MYSQL_PORT_TEST,
    user: env.SOCIAL_MYSQL_USER_TEST,
    password: env.SOCIAL_MYSQL_PASSWORD_TEST,
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
