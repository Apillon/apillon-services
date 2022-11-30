import { env, rebuildDatabase, seedDatabase } from '@apillon/lib';

const run = async () => {
  await await rebuildDatabase(
    env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
    env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
    env.DEV_CONSOLE_API_MYSQL_USER_TEST,
    env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
  );

  await seedDatabase(
    env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
    env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
    env.DEV_CONSOLE_API_MYSQL_USER_TEST,
    env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
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
