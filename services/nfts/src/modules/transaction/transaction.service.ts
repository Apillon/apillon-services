import { AppEnvironment, env } from '@apillon/lib';
import { TransactionStatus } from '../../config/types';
import {
  AppEnvironment,
  env,
  PoolConnection,
  SerializeFor,
  TransactionQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import { NftsValidationException } from '../../lib/exceptions';
import { executeTransactionStatusWorker } from '../../scripts/serverless-workers/execute-transaction-status-worker';
import { WalletService } from '../wallet/wallet.service';
import { TransactionDTO } from './dtos/transaction.dto';
import { Collection } from '../nfts/models/collection.model';
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

  static async sendTransaction(transaction: Transaction) {
    const walletService = new WalletService();
    const txResponse = await walletService.sendTransaction(
      transaction.rawTransaction,
    );
    transaction.transactionHash = txResponse.hash;
    transaction.transactionStatus = TransactionStatus.PENDING;
    await transaction.update();

    return transaction;
  }

  static async listCollectionTransactions(
    event: { collection_uuid: string; query: TransactionQueryFilter },
    context: ServiceContext,
  ) {
    return await new Transaction({}, context).getList(
      new TransactionQueryFilter(event.query),
    );
  }
}
