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
  conn: PoolConnection,
) {
  const transactionIds = [];

  for (let i = 0; i < webhooks.length; i++) {
    // TODO: There was some error checking here
    await sendToWorkerQueue(
      sqsUrl,
      workerName,
      [
        {
          data: webhooks[i],
        },
      ],
      null,
      null,
    );
    transactionIds.push(webhooks[i].id);
  }

  if (transactionIds.length > 0) {
    try {
      await context.mysql.paramExecute(
        `
          UPDATE \`${DbTables.TRANSACTION_QUEUE}\` 
          SET webhookTriggered = NOW()
          WHERE
            id in (${transactionIds.join(',')})`,
        null,
        conn,
      );

      await conn.commit();
      return transactionIds;
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  }

  return transactionIds;
}
