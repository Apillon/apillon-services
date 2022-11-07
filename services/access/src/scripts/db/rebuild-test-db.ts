import { env, rebuildDatabase, seedDatabase } from '@apillon/lib';

const run = async () => {
  await await rebuildDatabase(
    env.ACCESS_MYSQL_DATABASE_TEST,
    env.ACCESS_MYSQL_HOST_TEST,
    env.ACCESS_MYSQL_PORT_TEST,
    env.ACCESS_MYSQL_USER_TEST,
    env.ACCESS_MYSQL_PASSWORD_TEST,
  );
  await seedDatabase(
    env.ACCESS_MYSQL_DATABASE_TEST,
    env.ACCESS_MYSQL_HOST_TEST,
    env.ACCESS_MYSQL_PORT_TEST,
    env.ACCESS_MYSQL_USER_TEST,
    env.ACCESS_MYSQL_PASSWORD_TEST,
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
