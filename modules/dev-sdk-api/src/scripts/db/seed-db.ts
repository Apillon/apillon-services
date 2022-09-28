import * as readline from 'readline';
import { bgYellow, black } from 'colors/safe';
import { env } from 'at-lib';
import { seedDatabase } from 'at-lib';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let steps = 0;

const run = async (stepCount: number) => {
  await seedDatabase(
    env.AT_DEV_CONSOLE_API_DB,
    env.AT_DEV_CONSOLE_API_MYSQL_HOST,
    env.AT_DEV_CONSOLE_API_MYSQL_PORT,
    env.AT_DEV_CONSOLE_API_MYSQL_USER,
    env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD,
    stepCount,
  );
};

rl.question(
  `You are about to seed database ${bgYellow(
    black(
      ` ${env.AT_DEV_CONSOLE_API_DB} @ ${env.AT_DEV_CONSOLE_API_MYSQL_HOST} `,
    ),
  )}.

Set number of versions to seed ('Y' for all, '<number>' for number of versions, 'N' to exit):`,
  (answer) => {
    steps = parseInt(answer, 10);
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

    run(steps)
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
