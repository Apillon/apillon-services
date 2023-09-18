import {
  ChainType,
  Context,
  env,
  EvmChain,
  Lmas,
  LogType,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  WorkerDefinition,
  sendToWorkerQueue,
  BaseQueueWorker,
  QueueWorkerType,
  LogOutput,
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
  public async runExecutor(params: any): Promise<any> {
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

      // console.log('transactions: ', transactions);

      const crustWebhooks: TransactionWebhookDataDto[] = [];
      const nftWebhooks: TransactionWebhookDataDto[] = [];
      // const kiltWebooks: TransactionWebhookDataDto[] = [];

      if (transactions && transactions.length > 0) {
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i];
          if (transaction.chainType == ChainType.SUBSTRATE) {
            if (transaction.chain == SubstrateChain.CRUST) {
              const crustTWh =
                this.createSubstrateTransactionWebhookDto(transaction);
              crustWebhooks.push(crustTWh);
            } else if (transaction.chain == SubstrateChain.KILT) {
              // NOTE: Do nothing here.
              // const kiltTWh =
              //   this.createSubstrateTransactionWebhookDto(transaction);
              // kiltWebooks.push(kiltTWh);
            }
          } else if (
            transaction.chainType == ChainType.EVM &&
            (transaction.chain == EvmChain.MOONBEAM ||
              transaction.chain == EvmChain.MOONBASE ||
              transaction.chain == EvmChain.ASTAR_SHIBUYA ||
              EvmChain.ASTAR)
          ) {
            nftWebhooks.push(
              new TransactionWebhookDataDto().populate({
                id: transaction.id,
                transactionHash: transaction.transactionHash,
                referenceTable: transaction.referenceTable,
                referenceId: transaction.referenceId,
                transactionStatus: transaction.transactionStatus,
                data: transaction.data,
              }),
            );
          }
        }
      }

      /**
       * TODO:
       * If there will be multiple different services using the same blockchains then webhooks
       * need to be refactored. I would change so that the service creating transactions adds
       * sqsUrl and workerName. If those two are present in DB then we trigger the webhook for the
       * transactions otherwise we do nothing.
       */
      const updates = [
        // SUBSTRATE
        ...(await this.processWebhook(
          crustWebhooks,
          env.STORAGE_AWS_WORKER_SQS_URL,
          'UpdateCrustStatusWorker',
        )),

        // ...(await this.processWebhook(
        //   kiltWebooks,
        //   env.AUTH_AWS_WORKER_SQS_URL,
        //   'UpdateStateWorker',
        // )),

        // Evm
        ...(await this.processWebhook(
          nftWebhooks,
          env.NFTS_AWS_WORKER_SQS_URL,
          'TransactionStatusWorker',
        )),
      ];

      // console.log('updates: ', updates);
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

        await this.writeEventLog(
          {
            logType: LogType.INFO,
            message: `Triggered webhooks for ${updates.length} transactions!`,
            service: ServiceName.BLOCKCHAIN,
            data: { updates },
          },
          LogOutput.EVENT_INFO,
        );
      }
      await conn.commit();
    } catch (err) {
      // console.log(err);
      await conn.rollback();
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Error in TransactionWebhookWorker',
          service: ServiceName.BLOCKCHAIN,
          data: { params, err },
          err,
        },
        LogOutput.SYS_ERROR,
      );
      throw err;
    }

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

  async processWebhook(webhooks: any[], sqsUrl: string, workerName: string) {
    let updates = [];
    if (webhooks.length > 0) {
      const splits = this.splitter(webhooks, 10); // batch updates to up to 10 items
      for (let i = 0; i < splits.length; i++) {
        try {
          // sending batch by batch because we need to know if a failure occurred.
          const res = await sendToWorkerQueue(
            sqsUrl,
            workerName,
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
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              message: 'Error in TransactionWebhookWorker sending webhook',
              service: ServiceName.BLOCKCHAIN,
              data: { splits, e },
              err: e,
            },
            LogOutput.SYS_ERROR,
          );
        }
      }
    }
    return updates;
  }

  private createSubstrateTransactionWebhookDto(
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
}
