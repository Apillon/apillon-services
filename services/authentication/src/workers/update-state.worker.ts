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
import { TransactionType } from '../config/types';
import { Transaction } from '../modules/transaction/models/transaction.model';

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
      async (res: TransactionWebhookDataDto, ctx) => {
        console.info('processing webhook transaction: ', res);

        const transaction: Transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(res.transactionHash);

        console.log('YEHHHAHHH');

        if (transaction.exists()) {
          console.info('TRANSACTION ', transaction);

          res.transactionStatus == TransactionStatus.CONFIRMED
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
          transaction.transactionStatus = res.transactionStatus;
          await transaction.update();

          // perform custom logic, depend of transactionType
          if (transaction.transactionType == TransactionType.DID_CREATE) {
            if (res.transactionStatus == TransactionStatus.CONFIRMED) {
              console.log('DID success');
            } else {
              console.log('DID fail');
            }
          } else if (
            transaction.transactionType == TransactionType.ATTESTATION
          ) {
            if (res.transactionStatus == TransactionStatus.CONFIRMED) {
              console.log('ATTESTATION success');
            } else {
              console.log('ATTESTATION fail');
            }
          } else if (
            transaction.transactionType == TransactionType.DID_REVOKE
          ) {
            if (res.transactionStatus == TransactionStatus.CONFIRMED) {
              console.log('DID REVOKE success');
            } else {
              console.log('DID REVOKE fail');
            }
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
        } else {
          await new Lmas().writeLog({
            context: ctx,
            logType: LogType.ERROR,
            message: `Transaction for hash ${res.transactionHash} does not exist!`,
            location: `${this.constructor.name}/runExecutor`,
            service: ServiceName.AUTHENTICATION_API,
          });
        }
      },
    );
  }
}
