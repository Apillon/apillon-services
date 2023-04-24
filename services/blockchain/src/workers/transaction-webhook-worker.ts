import {
  ChainType,
  Context,
  env,
  Lmas,
  LogType,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  WorkerDefinition,
  WorkerLogStatus,
  sendToWorkerQueue,
  BaseQueueWorker,
  QueueWorkerType,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
export class TransactionWebhookWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.BLOCKCHAIN_AWS_WORKER_SQS_URL);
  }
  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(data: any): Promise<any> {
    console.info('RUN EXECUTOR (TransactionWebhookWorker). data: ', data);
    const conn = await this.context.mysql.start();

    try {
      const transactions = await this.context.mysql.paramExecute(
        `
          SELECT * FROM \`${DbTables.TRANSACTION_QUEUE}\`
          WHERE
            transactionStatus > ${TransactionStatus.PENDING}
            AND webhookTriggered IS NULL
          FOR UPDATE SKIP LOCKED`,
        null,
        conn,
      );

      console.log('transactions: ', transactions);

      let updates = [];
      const crustWebhooks = [];
      if (transactions && transactions.length > 0) {
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i];
          if (
            transaction.chainType == ChainType.SUBSTRATE &&
            transaction.chain == SubstrateChain.CRUST
          ) {
            crustWebhooks.push({
              id: transaction.id,
              transactionHash: transaction.transactionHash,
              referenceTable: transaction.referenceTable,
              referenceId: transaction.referenceId,
              transactionStatus: transaction.transactionStatus,
            });
          }
        }
      }

      if (crustWebhooks.length > 0) {
        const splits = this.splitter(crustWebhooks, 10); // batch updates to up to 10 items
        for (let i = 0; i < splits.length; i++) {
          try {
            // sending batch by batch because we need to know if a failure occurred.
            const res = await sendToWorkerQueue(
              env.STORAGE_AWS_WORKER_SQS_URL,
              'UpdateCrustStatusWorker',
              [
                {
                  data: splits[i],
                },
              ],
              null,
              null,
            );
            if (res.errCount > 0) {
              throw new Error(res.errMsgs[0]);
            }

            console.log('pushed webhook');
            updates = [...updates, splits[i].map((a) => a.id)];
          } catch (e) {
            console.log(e);
            await new Lmas().writeLog({
              context: this.context,
              logType: LogType.ERROR,
              message: 'Error in TransactionWebhookWorker sending webhook',
              location: `${this.constructor.name}/runExecutor`,
              service: ServiceName.BLOCKCHAIN,
              data: {
                data,
                e,
              },
            });
          }
        }
      }

      console.log('updates: ', updates);
      if (updates.length > 0) {
        await this.context.mysql.paramExecute(
          `
            UPDATE \`${DbTables.TRANSACTION_QUEUE}\` 
            SET webhookTriggered = NOW()
            WHERE
              id in (${updates.join(',')})`,
          null,
          conn,
        );
      }
      await conn.commit();
      await new Lmas().writeLog({
        context: this.context,
        logType: LogType.INFO,
        message: 'TransactionWebhookWorker finished',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.BLOCKCHAIN,
        data: data,
      });
    } catch (err) {
      console.log(err);
      await conn.rollback();
      await new Lmas().writeLog({
        context: this.context,
        logType: LogType.ERROR,
        message: 'Error in TransactionWebhookWorker',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          data,
          err,
        },
      });
      throw err;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `TransactionWebhookWorker worker has been completed!`,
    );

    return true;
  }

  splitter(arr, splitBy) {
    const cache = [];
    const tmp = [...arr];
    while (tmp.length) {
      cache.push(tmp.splice(0, splitBy));
    }
    return cache;
  }
}
