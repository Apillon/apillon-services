import {
  AppEnvironment,
  env,
  PoolConnection,
  SerializeFor,
  TransactionQueryFilter,
} from '@apillon/lib';
import { DbTables, NftsErrorCode, TransactionStatus } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  NftsCodeException,
  NftsValidationException,
} from '../../lib/exceptions';
import { executeTransactionStatusWorker } from '../../scripts/serverless-workers/execute-transaction-status-worker';
import { Collection } from '../nfts/models/collection.model';
import { WalletService } from '../wallet/wallet.service';
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
      if (!transaction.isValid()) {
        throw new NftsValidationException(transaction);
      }
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
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(event.collection_uuid);
    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
      });
    }
    collection.canAccess(context);

    const query = new TransactionQueryFilter(event.query);
    query.populate({
      refTable: DbTables.COLLECTION,
      refId: collection.id,
    });

    return await new Transaction({}, context).getList(query);
  }
}
