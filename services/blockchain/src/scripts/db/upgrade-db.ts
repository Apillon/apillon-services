import * as readline from 'readline';
import { bgYellow, black } from 'colors/safe';
import { env, upgradeDatabase } from '@apillon/lib';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let steps = 0;

const run = async () => {
  await upgradeDatabase(
    env.ACCESS_MYSQL_DATABASE,
    env.ACCESS_MYSQL_HOST,
    env.ACCESS_MYSQL_PORT,
    env.ACCESS_MYSQL_USER,
    env.ACCESS_MYSQL_PASSWORD,
    steps,
  );
};

rl.question(
  `You are about to upgrade database ${bgYellow(
    black(` ${env.ACCESS_MYSQL_DATABASE} @ ${env.ACCESS_MYSQL_HOST} `),
  )}.

Set number of versions to upgrade ('Y' for all, '<number>' for number of versions, 'N' to exit):`,
  (answer) => {
    steps = parseInt(answer);
    if (answer.toUpperCase() === 'Y') {
      steps = 0;
      console.log('Upgrading to LATEST version.');
    } else if (steps) {
      console.log(`Upgrading for ${steps} version(s).`);
    } else {
      console.log('Invalid input. Exiting.');
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
