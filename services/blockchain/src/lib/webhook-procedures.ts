import {
  Context,
  PoolConnection,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { DbTables } from '../config/types';

export function createSubstrateTxWebhookDto(
  transaction,
): TransactionWebhookDataDto {
  return new TransactionWebhookDataDto().populate({
    id: transaction.id,
    transactionHash: transaction.transactionHash,
    referenceTable: transaction.referenceTable,
    referenceId: transaction.referenceId,
    transactionStatus: transaction.transactionStatus,
    data: transaction.data,
  });
}

export async function processWebhooks(
  webhooks: TransactionWebhookDataDto[],
  sqsUrl: string,
  workerName: string,
  context: Context,
) {
  const transactionIds = [];

  // Configure as needed
  const chunkSize = 10;
  for (let i = 0; i < webhooks.length; i += chunkSize) {
    const chunk = webhooks.slice(i, i + chunkSize);

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
    transactionIds.push(webhooks[i].id);
  }

  if (transactionIds.length > 0) {
    await context.mysql.paramExecute(
      `
      UPDATE \`${DbTables.TRANSACTION_QUEUE}\` 
      SET webhookTriggered = NOW()
      WHERE
        id in (${transactionIds.join(',')})`,
      null,
    );
  }

  return transactionIds;
}
