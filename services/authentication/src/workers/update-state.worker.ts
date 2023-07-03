import {
  Lmas,
  LogType,
  ServiceName,
  TransactionStatus,
  TransactionWebhookDataDto,
  env,
  runWithWorkers,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../modules/transaction/models/transaction.model';
import { TransactionType } from '../config/types';

export class UpdateStateWorker extends BaseQueueWorker {
  context;

  public constructor(
    workerDefinition: WorkerDefinition,
    context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.AUTH_AWS_WORKER_SQS_URL);
    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: any): Promise<any> {
    console.info('RUN EXECUTOR (UpdateStateWorker). data: ', input);

    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (result: TransactionWebhookDataDto, ctx) => {
        console.info('processing webhook transaction: ', result);
        const data = JSON.parse(result.data);
        const status = result.transactionStatus;

        const transaction: Transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(result.transactionHash);

        if (transaction.exists()) {
          status == TransactionStatus.CONFIRMED
            ? await new Lmas().writeLog({
                context: ctx,
                logType: LogType.INFO,
                message: `Transaction ${transaction.transactionType} SUCCESS`,
                location: `${this.constructor.name}/runExecutor`,
                service: ServiceName.AUTHENTICATION_API,
              })
            : await new Lmas().writeLog({
                context: ctx,
                logType: LogType.ERROR,
                message: `Transaction ${transaction.transactionType} FAILED`,
                location: `${this.constructor.name}/runExecutor`,
                service: ServiceName.AUTHENTICATION_API,
              });

          // Update status
          transaction.transactionStatus = status;
          await transaction.update();

          // perform custom logic, depend of transactionType
          if (status === TransactionStatus.CONFIRMED) {
            if (transaction.transactionType == TransactionType.DID_CREATE) {
              console.log('DID success');
            } else if (
              transaction.transactionType == TransactionType.ATTESTATION
            ) {
              console.log('ATTESTATION success');
            } else if (
              transaction.transactionType == TransactionType.DID_REVOKE
            ) {
              console.log('DID REVOKE success');
            } else {
              // Execute attestation
              await new Lmas().writeLog({
                context: ctx,
                logType: LogType.ERROR,
                message: 'Invalid transaction type',
                location: `${this.constructor.name}/runExecutor`,
                service: ServiceName.AUTHENTICATION_API,
              });
            }
          }
        } else {
          await new Lmas().writeLog({
            context: ctx,
            logType: LogType.ERROR,
            message: `Transaction for hash ${result.transactionHash} does not exist!`,
            location: `${this.constructor.name}/runExecutor`,
            service: ServiceName.AUTHENTICATION_API,
          });
        }
      },
    );
  }
}
