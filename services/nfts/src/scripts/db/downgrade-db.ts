import * as readline from 'readline';
import { env, downgradeDatabase } from '@apillon/lib';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let steps = 1;

const run = async () => {
  await downgradeDatabase(
    env.NFTS_MYSQL_DATABASE,
    env.NFTS_MYSQL_HOST,
    env.NFTS_MYSQL_PORT,
    env.NFTS_MYSQL_USER,
    env.NFTS_MYSQL_PASSWORD,
    steps,
  );
};

rl.question(
  `You are about to downgrade database ${env.NFTS_MYSQL_DATABASE} @ ${env.NFTS_MYSQL_HOST}.\n Set number of versions to downgrade (-1 for all, 0 to exit):`,
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
