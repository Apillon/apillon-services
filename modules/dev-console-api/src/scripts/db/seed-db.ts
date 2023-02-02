import * as readline from 'readline';
import { bgYellow, black } from 'colors/safe';
import { env } from '@apillon/lib';
import { seedDatabase } from '@apillon/lib';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let steps = 0;

const run = async (stepCount: number) => {
  await seedDatabase(
    env.DEV_CONSOLE_API_MYSQL_DATABASE,
    env.DEV_CONSOLE_API_MYSQL_HOST,
    env.DEV_CONSOLE_API_MYSQL_PORT,
    env.DEV_CONSOLE_API_MYSQL_USER,
    env.DEV_CONSOLE_API_MYSQL_PASSWORD,
    stepCount,
  );
};
if (process.argv.includes('--F')) {
  console.log(
    `Seeding database ${bgYellow(
      black(
        ` ${env.DEV_CONSOLE_API_MYSQL_DATABASE} @ ${env.DEV_CONSOLE_API_MYSQL_DATABASE} `,
      ),
    )}`,
  );
  run(steps)
    .then(() => {
      console.log('Complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
} else {
  rl.question(
    `You are about to seed database ${bgYellow(
      black(
        ` ${env.DEV_CONSOLE_API_MYSQL_DATABASE} @ ${env.DEV_CONSOLE_API_MYSQL_HOST} `,
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
}
