import { env, rebuildDatabase, seedDatabase } from '@apillon/lib';

const run = async () => {
  await await rebuildDatabase(
    env.CONFIG_MYSQL_DATABASE_TEST,
    env.CONFIG_MYSQL_HOST_TEST,
    env.CONFIG_MYSQL_PORT_TEST,
    env.CONFIG_MYSQL_USER_TEST,
    env.CONFIG_MYSQL_PASSWORD_TEST,
  );
  await seedDatabase(
    env.CONFIG_MYSQL_DATABASE_TEST,
    env.CONFIG_MYSQL_HOST_TEST,
    env.CONFIG_MYSQL_PORT_TEST,
    env.CONFIG_MYSQL_USER_TEST,
    env.CONFIG_MYSQL_PASSWORD_TEST,
  );
};

run()
  .then(() => {
    console.log('Complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
