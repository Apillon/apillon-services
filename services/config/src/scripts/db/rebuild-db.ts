import { env, rebuildDatabase, seedDatabase } from '@apillon/lib';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const run = async () => {
  await rebuildDatabase(
    env.CONFIG_MYSQL_DATABASE,
    env.CONFIG_MYSQL_HOST,
    env.CONFIG_MYSQL_PORT,
    env.CONFIG_MYSQL_USER,
    env.CONFIG_MYSQL_PASSWORD,
  );
  await seedDatabase(
    env.CONFIG_MYSQL_DATABASE,
    env.CONFIG_MYSQL_HOST,
    env.CONFIG_MYSQL_PORT,
    env.CONFIG_MYSQL_USER,
    env.CONFIG_MYSQL_PASSWORD,
  );
};

rl.question(
  `You are about to reset database ${env.CONFIG_MYSQL_DATABASE} @ ${env.CONFIG_MYSQL_HOST}.\n Are you sure? (Yes/No):`,
  (answer) => {
    if (answer.toLowerCase() === 'yes') {
      console.log('Rebuilding database ...');
    } else {
      console.log('Exiting.');
      process.exit(0);
    }

    rl.close();

    run()
      .then(() => {
        console.log('Complete!');
        process.exit(0);
      })
      .catch((err) => {
        console.log(err);
        process.exit(1);
      });
  },
);
