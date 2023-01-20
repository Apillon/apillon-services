import * as readline from 'readline';
import { env, downgradeDatabase } from '@apillon/lib';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let steps = 1;

const run = async () => {
  await downgradeDatabase(
    env.BLOCKCHAIN_MYSQL_DATABASE,
    env.BLOCKCHAIN_MYSQL_HOST,
    env.BLOCKCHAIN_MYSQL_PORT,
    env.BLOCKCHAIN_MYSQL_USER,
    env.BLOCKCHAIN_MYSQL_PASSWORD,
    steps,
  );
};

rl.question(
  `You are about to downgrade database ${env.BLOCKCHAIN_MYSQL_DATABASE} @ ${env.BLOCKCHAIN_MYSQL_HOST}.\n Set number of versions to downgrade (-1 for all, 0 to exit):`,
  (answer) => {
    steps = parseInt(answer);
    if (steps) {
      console.log(`Downgrading ${steps > 0 ? steps : 'ALL'} version(s).`);
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
