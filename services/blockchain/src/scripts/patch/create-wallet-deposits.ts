// Use this script to create wallet deposits in the wallet_deposit DB table from existing records in transaction_log table
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { MySql, env, getEnvSecrets } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { TransactionLogWorker } from '../../workers/transaction-log-worker';
import { DbTables } from '../../config/types';

async function run() {
  const wd = new WorkerDefinition(
    {
      type: ServiceDefinitionType.SQS,
      config: { region: 'local' },
      params: { FunctionName: 'local' },
    },
    'create-wallet-deposits-script',
    { parameters: { batchLimit: 200 } },
  );
  await getEnvSecrets();

  const db = new MySql({
    host: env.BLOCKCHAIN_MYSQL_HOST,
    database: env.BLOCKCHAIN_MYSQL_DATABASE,
    password: env.BLOCKCHAIN_MYSQL_PASSWORD,
    port: env.BLOCKCHAIN_MYSQL_PORT,
    user: env.BLOCKCHAIN_MYSQL_USER,
  });
  await db.connect();
  const context = new ServiceContext();
  context.mysql = db;

  const worker = new TransactionLogWorker(wd, context, QueueWorkerType.PLANNER);

  const wallets = await worker.runPlanner();

  for (const wallet of wallets) {
    const transactions = await db.paramExecute(
      `SELECT * from ${DbTables.TRANSACTION_LOG}
      WHERE wallet = @address
      ORDER BY id ASC
      ;`,
      { address: wallet.wallet.address },
    );
    await worker.processWalletDepositAmounts(wallet.wallet, transactions);
  }
}

run()
  .then(() => {
    console.log('DONE!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
