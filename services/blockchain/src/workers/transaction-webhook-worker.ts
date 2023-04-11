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
      const res = await this.context.mysql.paramExecute(
        `
          SELECT * FROM \`${DbTables.TRANSACTION_QUEUE}\`
          WHERE
            transactionStatus > ${TransactionStatus.PENDING}
            AND webhookTriggered IS NULL
          FOR UPDATE SKIP LOCKED`,
        null,
        conn,
      );

      const updates = [];
      if (res && res.length > 0) {
        const transactions = res[0];
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i];
          if (
            transaction.chainType == ChainType.SUBSTRATE &&
            transaction.chain == SubstrateChain.CRUST
          ) {
            try {
              await sendToWorkerQueue(
                env.STORAGE_AWS_WORKER_SQS_URL,
                'UpdateCrustStatusWorker', // todo storage worker name
                [
                  {
                    id: transaction.id,
                    transactionHash: transaction.transactionHash,
                    referenceTable: transaction.referenceTable,
                    referenceId: transaction.referenceId,
                    transactionStatus: transaction.transactionStatus,
                  },
                ],
                null,
                null,
              );
              updates.push(transaction.id);
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
      }

      if (updates.length > 0) {
        await this.context.mysql.paramExecute(
          `
            UPDATE \`${DbTables.TRANSACTION_QUEUE}\` 
            SET webhookTriggered = NOW()
            WHERE
              id in (@updates)`,
          { updates },
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
}
