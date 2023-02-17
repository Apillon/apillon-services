import {
  AppEnvironment,
  env,
  PoolConnection,
  SerializeFor,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import { NftsValidationException } from '../../lib/exceptions';
import { executeTransactionStatusWorker } from '../../scripts/serverless-workers/execute-transaction-status-worker';
import { Transaction } from './models/transaction.model';

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
      if (!transaction.isValid())
        throw new NftsValidationException(transaction);
    }
    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }

  static async checkTransactionsStatus(params: any, context: ServiceContext) {
    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      await executeTransactionStatusWorker(context);
      return true;
    }
    return false;
  }
}
