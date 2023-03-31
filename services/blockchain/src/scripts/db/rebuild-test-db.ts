import { env, rebuildDatabase, seedDatabase } from '@apillon/lib';

const run = async () => {
  await await rebuildDatabase(
    env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
    env.BLOCKCHAIN_MYSQL_HOST_TEST,
    env.BLOCKCHAIN_MYSQL_PORT_TEST,
    env.BLOCKCHAIN_MYSQL_USER_TEST,
    env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
  );
  await seedDatabase(
    env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
    env.BLOCKCHAIN_MYSQL_HOST_TEST,
    env.BLOCKCHAIN_MYSQL_PORT_TEST,
    env.BLOCKCHAIN_MYSQL_USER_TEST,
    env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
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
