import {
  AppEnvironment,
  Context,
  PoolConnection,
  TransactionStatus,
  TransactionWebhookDataDto,
  env,
} from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { DbTables } from '../config/types';

/**
 * Get transactions with status 2 for specified address, generate webHook data array and send data to sqs
 * @param context
 * @param address wallet address
 * @param workerName worker, which will process this webhook
 * @param sqsUrl url of sqs, where webhook should be sent
 */
export async function executeWebhooksForTransmittedTransactionsInWallet(
  context: Context,
  address: string,
  workerName: string,
  sqsUrl: string,
) {
  const conn = await context.mysql.start();
  try {
    const webhooks = await getWebhooksForTxsInWallet(context, address, conn);
    await processWebhooks(webhooks, sqsUrl, workerName, context, conn);
    await context.mysql.commit(conn);
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

/**
 * Query DB for transactions, which were transmitted but not yet sent to webhook.
 * @param context
 * @param address
 * @param conn
 * @returns array of webhook data objects
 */
export async function getWebhooksForTxsInWallet(
  context: Context,
  address: string,
  conn: PoolConnection,
): Promise<TransactionWebhookDataDto[]> {
  const transactions = await context.mysql.paramExecute(
    `
      SELECT * FROM \`${DbTables.TRANSACTION_QUEUE}\`
      WHERE
        transactionStatus > ${TransactionStatus.PENDING}
        AND webhookTriggered IS NULL
        AND address = @address
      FOR UPDATE SKIP LOCKED`,
    { address },
    conn,
  );

  const webhooks: TransactionWebhookDataDto[] = [];
  for (const tx of transactions) {
    webhooks.push(new TransactionWebhookDataDto(tx, context));
  }
  return webhooks;
}

/**
 * Send data to sqs and update webhookTriggered property in transactionQueue table
 * @param webhooks
 * @param sqsUrl
 * @param workerName
 * @param context
 * @param conn
 * @returns
 */
export async function processWebhooks(
  webhooks: TransactionWebhookDataDto[],
  sqsUrl: string,
  workerName: string,
  context: Context,
  conn: PoolConnection,
) {
  const transactionIds = [];

  // Configure as needed
  const processSize = 10;

  for (let i = 0; i < webhooks.length; i += processSize) {
    const chunk = webhooks.slice(i, i + processSize);

    if (chunk.length > 0) {
      if (env.APP_ENV != AppEnvironment.TEST) {
        await sendToWorkerQueue(
          sqsUrl,
          workerName,
          [
            {
              data: chunk,
            },
          ],
          null,
          null,
        );
      }

      // Extract ids from the transactions
      transactionIds.push(...chunk.map((x) => x.id));
    }
  }

  if (transactionIds.length > 0) {
    await context.mysql.paramExecute(
      `
      UPDATE \`${DbTables.TRANSACTION_QUEUE}\` 
      SET webhookTriggered = NOW()
      WHERE
        id in (${transactionIds.join(',')})`,
      null,
      conn,
    );
  }

  return transactionIds;
}
