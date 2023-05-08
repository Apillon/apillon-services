import {
  Context,
  env,
  LogType,
  runWithWorkers,
  SqlModelStatus,
  TransactionStatus,
  TransactionWebhookDataDto,
  writeLog,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CollectionStatus, TransactionType } from '../config/types';
import { Collection } from '../modules/nfts/models/collection.model';
import { Transaction } from '../modules/transaction/models/transaction.model';
import { TransactionService } from '../modules/transaction/transaction.service';

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
    console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);

    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (res: TransactionWebhookDataDto) => {
        console.info('processing webhook transaction: ', res);
        const nftTransaction: Transaction = await new Transaction(
          {},
          this.context,
        ).populateByTransactionHash(res.transactionHash);
        if (nftTransaction.exists()) {
          console.info('nftTransaction: ', nftTransaction);
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
      console.log(
        `Collection (id=${collection.id}) updated 
          (
            contractAddress=${collection.contractAddress}, 
            txHash=${collection.transactionHash}, 
            collectionStatus=${collection.collectionStatus}
          )`,
      );
    }
  }
}
