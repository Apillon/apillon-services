import {
  Context,
  env,
  LogType,
  ProductCode,
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
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
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

          // perform custom logic, depend of transactionType
          if (
            nftTransaction.transactionType == TransactionType.DEPLOY_CONTRACT ||
            nftTransaction.transactionType ==
              TransactionType.TRANSFER_CONTRACT_OWNERSHIP
          ) {
            //Update collection
            await this.updateCollectionStatus(nftTransaction);
          }

          //Refund credit if transaction failed
          if (res.transactionStatus > 2) {
            let product_id;
            switch (nftTransaction.transactionType) {
              case TransactionType.DEPLOY_CONTRACT:
                product_id = ProductCode.NFT_COLLECTION;
                break;
              case TransactionType.TRANSFER_CONTRACT_OWNERSHIP:
                product_id = ProductCode.NFT_TRANSFER_COLLECTION;
                break;
              case TransactionType.BURN_NFT:
                product_id = ProductCode.NFT_BURN;
                break;
              case TransactionType.MINT_NFT:
              case TransactionType.NEST_MINT_NFT:
                product_id = ProductCode.NFT_COLLECTION;
                break;
            }

            const referenceTable =
              nftTransaction.transactionType == TransactionType.DEPLOY_CONTRACT
                ? DbTables.COLLECTION
                : DbTables.TRANSACTION;
            const referenceId =
              nftTransaction.transactionType == TransactionType.DEPLOY_CONTRACT
                ? nftTransaction.refId
                : nftTransaction.id;

            await refundCredit(
              this.context,
              referenceTable,
              referenceId.toString(),
              'TransactionStatusWorker.runExecutor',
              ServiceName.NFTS,
              product_id,
            );
          }
        }
      },
    );
  }

  private async updateCollectionStatus(tx: Transaction) {
    if (tx.transactionStatus === TransactionStatus.CONFIRMED) {
      const collection: Collection = await new Collection(
        {},
        this.context,
      ).populateById(tx.refId);

      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        collection.collectionStatus = CollectionStatus.DEPLOYED;
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
