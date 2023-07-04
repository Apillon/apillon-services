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
    console.info('RUN EXECUTOR (UpdateStateWorker). data: ', input.data);
    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (result: any, ctx) => {
        console.log(result);
        const incomingTx = result;

        const status = result.transactionStatus;
        const txType = result.data.transactionType;

        console.log('Transaction status ', incomingTx.transactionHash);

        const transaction: Transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(incomingTx.transactionHash);

        console.log('Transaction ', transaction);
        console.log('Transaction status ', transaction);
        console.log('Transaction type: ', txType);
        console.log('Transaction stauts: ', status);

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

          console.log('Transaction type: ', txType);
          console.log('Transaction stauts: ', status);

          // perform custom logic, depend of transactionType
          if (status === TransactionStatus.CONFIRMED) {
            if (txType == TransactionType.DID_CREATE) {
              console.log('DID success');
            } else if (txType == TransactionType.ATTESTATION) {
              console.log('ATTESTATION success');
            } else if (txType == TransactionType.DID_REVOKE) {
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
