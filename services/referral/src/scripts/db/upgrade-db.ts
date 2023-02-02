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
    env.REFERRAL_MYSQL_DATABASE,
    env.REFERRAL_MYSQL_HOST,
    env.REFERRAL_MYSQL_PORT,
    env.REFERRAL_MYSQL_USER,
    env.REFERRAL_MYSQL_PASSWORD,
    steps,
  );
};
if (process.argv.includes('--F')) {
  console.log(
    `Upgrading database ${bgYellow(
      black(` ${env.REFERRAL_MYSQL_DATABASE} @ ${env.REFERRAL_MYSQL_HOST} `),
    )}`,
  );
  run()
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
    `You are about to upgrade database ${bgYellow(
      black(` ${env.REFERRAL_MYSQL_DATABASE} @ ${env.REFERRAL_MYSQL_HOST} `),
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
}