import { PoolConnection, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from './models/transaction.model';
import { AuthenticationValidationException } from '../../lib/exceptions';

export class TransactionService {
  static async saveTransaction(
    context: ServiceContext,
    transaction: Transaction,
    conn: PoolConnection,
  ) {
    try {
      await transaction.validate();
    } catch (err) {
      await transaction.handle(err);
      if (!transaction.isValid()) {
        throw new AuthenticationValidationException(transaction);
      }
    }
    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }

  //   static async checkTransactionsStatus(params: any, context: ServiceContext) {
  //     if (
  //       env.APP_ENV == AppEnvironment.LOCAL_DEV ||
  //       env.APP_ENV == AppEnvironment.TEST
  //     ) {
  //       await executeTransactionStatusWorker(context);
  //       return true;
  //     }
  //     return false;
  //   }

  //   /**
  //    * Local_dev function to simulate webhook call from BCS
  //    * @param event
  //    * @param context
  //    */
  //   static async checkTransactionStatusAndRunWorker(
  //     event: { transactionWebhookData: TransactionWebhookDataDto },
  //     context: ServiceContext,
  //   ) {
  //     if (env.APP_ENV != AppEnvironment.LOCAL_DEV) {
  //       throw new CodeException({
  //         status: 405,
  //         code: NftsErrorCode.METHOD_NOT_ALLOWED,
  //       });
  //     }
  //     const transaction: Transaction = await new Transaction(
  //       {},
  //       context,
  //     ).populateByTransactionHash(event.transactionWebhookData.transactionHash);

  //     if (!transaction.exists()) {
  //       throw new NftsCodeException({
  //         status: 500,
  //         code: NftsErrorCode.TRANSACTION_NOT_FOUNT,
  //         context: context,
  //       });
  //     }

  //     //Run worker - simulate webhook from blockchain service
  //     //Directly calls worker, to sync files to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
  //     const serviceDef: ServiceDefinition = {
  //       type: ServiceDefinitionType.SQS,
  //       config: { region: 'test' },
  //       params: { FunctionName: 'test' },
  //     };
  //     const parameters = {
  //       data: [event.transactionWebhookData],
  //     };
  //     const wd = new WorkerDefinition(serviceDef, WorkerName.TRANSACTION_STATUS, {
  //       parameters,
  //     });

  //     const worker = new TransactionStatusWorker(
  //       wd,
  //       context,
  //       QueueWorkerType.EXECUTOR,
  //     );
  //     await worker.runExecutor({
  //       data: [event.transactionWebhookData],
  //     });
  //   }

  //   static async updateTransactionStatusInHashes(
  //     context: ServiceContext,
  //     hashes: string[],
  //     status: TransactionStatus,
  //     conn: PoolConnection,
  //   ) {
  //     await context.mysql.paramExecute(
  //       `UPDATE \`${DbTables.TRANSACTION}\`
  //       SET transactionStatus = @status
  //       WHERE
  //         AND transactionHash in ('${hashes.join("','")}')`,
  //       {
  //         status,
  //       },
  //       conn,
  //     );
  //   }
}
