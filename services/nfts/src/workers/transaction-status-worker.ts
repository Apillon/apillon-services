import {
  ChainType,
  Context,
  env,
  LogType,
  refundCredit,
  runWithWorkers,
  ServiceName,
  SqlModelStatus,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CollectionStatus, DbTables, TransactionType } from '../config/types';
import { Collection } from '../modules/nfts/models/collection.model';
import { Transaction } from '../modules/transaction/models/transaction.model';

export class TransactionStatusWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.NFTS_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(input: {
    data: TransactionWebhookDataDto[];
  }): Promise<any> {
    // console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);

    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (res: TransactionWebhookDataDto, ctx) => {
        // console.info('processing webhook transaction: ', res);
        const nftTransaction: Transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(res.transactionHash);
        if (nftTransaction.exists()) {
          // console.info('nftTransaction: ', nftTransaction);
          nftTransaction.transactionStatus = res.transactionStatus;
          await nftTransaction.update();

          const collection: Collection = await new Collection(
            {},
            this.context,
          ).populateById(nftTransaction.refId);
          // perform custom logic, depend of transactionType
          if (
            nftTransaction.transactionType == TransactionType.DEPLOY_CONTRACT ||
            nftTransaction.transactionType ==
              TransactionType.TRANSFER_CONTRACT_OWNERSHIP
          ) {
            //Update collection
            await this.updateCollectionStatus(
              nftTransaction,
              collection,
              res.data,
            );
          }

          //Refund credit if transaction failed
          if (res.transactionStatus > 2) {
            //For ContractDeploy, reference for credit is collection. For other transaction_uuid se set as reference.
            const referenceTable =
              nftTransaction.transactionType == TransactionType.DEPLOY_CONTRACT
                ? DbTables.COLLECTION
                : DbTables.TRANSACTION;
            const referenceId =
              nftTransaction.transactionType == TransactionType.DEPLOY_CONTRACT
                ? nftTransaction.refId // this is collection_uuid
                : nftTransaction.transaction_uuid;

            await refundCredit(
              this.context,
              referenceTable,
              referenceId.toString(),
              'TransactionStatusWorker.runExecutor',
              ServiceName.NFTS,
            );
          }
        }
      },
    );
  }

  private async updateCollectionStatus(
    tx: Transaction,
    collection: Collection,
    data: string,
  ) {
    if (tx.transactionStatus === TransactionStatus.CONFIRMED) {
      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        collection.collectionStatus = CollectionStatus.DEPLOYED;
        if (data && collection.chainType === ChainType.SUBSTRATE) {
          collection.contractAddress = data;
        }
      } else if (
        tx.transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP
      ) {
        collection.collectionStatus = CollectionStatus.TRANSFERED;
      }
      collection.status = SqlModelStatus.ACTIVE;
      await collection.update();

      await this.writeEventLog({
        logType: LogType.INFO,
        project_uuid: collection?.project_uuid,
        message: `Collection ${collection.name} status updated`,
        service: ServiceName.NFTS,
        data: {
          collection_uuid: collection.collection_uuid,
          collectionStatus: collection.collectionStatus,
          updateTime: collection.updateTime,
        },
      });
    }
  }
}
