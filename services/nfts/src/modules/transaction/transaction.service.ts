import {
  AppEnvironment,
  CodeException,
  env,
  PoolConnection,
  SerializeFor,
  TransactionQueryFilter,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import { DbTables, NftsErrorCode } from '../../config/types';
import { ServiceContext, getSerializationStrategy } from '@apillon/service-lib';
import {
  NftsCodeException,
  NftsValidationException,
} from '../../lib/exceptions';
import { executeTransactionStatusWorker } from '../../scripts/serverless-workers/execute-transaction-status-worker';
import { Collection } from '../nfts/models/collection.model';
import { Transaction } from './models/transaction.model';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { TransactionStatusWorker } from '../../workers/transaction-status-worker';

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

    return await new Transaction({}, context).getList(
      context,
      query,
      getSerializationStrategy(context),
    );
  }

  /**
   * Local_dev function to simulate webhook call from BCS
   * @param event
   * @param context
   */
  static async checkTransactionStatusAndRunWorker(
    event: { transactionWebhookData: TransactionWebhookDataDto },
    context: ServiceContext,
  ) {
    if (env.APP_ENV != AppEnvironment.LOCAL_DEV) {
      throw new CodeException({
        status: 405,
        code: NftsErrorCode.METHOD_NOT_ALLOWED,
      });
    }
    const transaction: Transaction = await new Transaction(
      {},
      context,
    ).populateByTransactionHash(event.transactionWebhookData.transactionHash);

    if (!transaction.exists()) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.TRANSACTION_NOT_FOUNT,
        context: context,
      });
    }

    //Run worker - simulate webhook from blockchain service
    //Directly calls worker, to sync files to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const parameters = {
      data: [event.transactionWebhookData],
    };
    const wd = new WorkerDefinition(serviceDef, WorkerName.TRANSACTION_STATUS, {
      parameters,
    });

    const worker = new TransactionStatusWorker(
      wd,
      context,
      QueueWorkerType.EXECUTOR,
    );
    await worker.runExecutor({
      data: [event.transactionWebhookData],
    });
  }

  static async updateTransactionStatusInHashes(
    context: ServiceContext,
    hashes: string[],
    status: TransactionStatus,
    conn: PoolConnection,
  ) {
    await context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION}\`
      SET transactionStatus = @status
      WHERE
        AND transactionHash in ('${hashes.join("','")}')`,
      {
        status,
      },
      conn,
    );
  }
}
