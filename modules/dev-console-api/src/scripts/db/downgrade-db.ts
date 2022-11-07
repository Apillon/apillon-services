import * as readline from 'readline';
import { env, downgradeDatabase } from '@apillon/lib';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let steps = 1;

const run = async () => {
  await downgradeDatabase(
    env.DEV_CONSOLE_API_MYSQL_DATABASE,
    env.DEV_CONSOLE_API_MYSQL_HOST,
    env.DEV_CONSOLE_API_MYSQL_PORT,
    env.DEV_CONSOLE_API_MYSQL_USER,
    env.DEV_CONSOLE_API_MYSQL_PASSWORD,
    steps,
  );
};

rl.question(
  `You are about to downgrade database ${env.DEV_CONSOLE_API_MYSQL_DATABASE} @ ${env.DEV_CONSOLE_API_MYSQL_HOST}.\n Set number of versions to downgrade (-1 for all, 0 to exit):`,
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
