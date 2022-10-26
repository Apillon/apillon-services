import { env, rebuildDatabase, seedDatabase } from 'at-lib';

const run = async () => {
  await await rebuildDatabase(
    env.AT_AMS_MYSQL_DATABASE_TEST,
    env.AT_AMS_MYSQL_HOST_TEST,
    env.AT_AMS_MYSQL_PORT_TEST,
    env.AT_AMS_MYSQL_USER_TEST,
    env.AT_AMS_MYSQL_PASSWORD_TEST,
  );
  await seedDatabase(
    env.AT_AMS_MYSQL_DATABASE_TEST,
    env.AT_AMS_MYSQL_HOST_TEST,
    env.AT_AMS_MYSQL_PORT_TEST,
    env.AT_AMS_MYSQL_USER_TEST,
    env.AT_AMS_MYSQL_PASSWORD_TEST,
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
