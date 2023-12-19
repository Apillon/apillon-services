import {
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ComputingTransactionStatus } from '../config/types';
import { Transaction } from '../modules/transaction/models/transaction.model';

function mapTransactionStatus(transactionStatus: TransactionStatus) {
  switch (transactionStatus) {
    case TransactionStatus.PENDING:
      return ComputingTransactionStatus.PENDING;
    case TransactionStatus.CONFIRMED:
      return ComputingTransactionStatus.CONFIRMED;
    case TransactionStatus.FAILED:
      return ComputingTransactionStatus.FAILED;
    case TransactionStatus.ERROR:
      return ComputingTransactionStatus.ERROR;
    default:
      throw new Error(
        `Cant map TransactionStatus ${transactionStatus} to ComputingTransactionStatus.`,
      );
  }
}

export class TransactionStatusWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: {
    data: TransactionWebhookDataDto[];
  }): Promise<any> {
    console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);
    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (res: TransactionWebhookDataDto, ctx) => {
        const computingTransaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (!computingTransaction.exists()) {
          await this.writeEventLog({
            logType: LogType.ERROR,
            message: `Computing transaction with hash ${res.transactionHash} not found.`,
            service: ServiceName.COMPUTING,
            data: res,
          });
          return;
        }

        await this.writeEventLog({
          logType: LogType.INFO,
          message: `Updating computing transaction with hash ${res.transactionHash}.`,
          service: ServiceName.COMPUTING,
          data: res,
        });
        computingTransaction.transactionStatus = mapTransactionStatus(
          res.transactionStatus,
        );
        await computingTransaction.update();
      },
    );
  }
}
