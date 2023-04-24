import { Context, env, SqlModelStatus } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  CollectionStatus,
  TransactionStatus,
  TransactionType,
} from '../config/types';
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
  public async runExecutor(input: any): Promise<any> {
    console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);

    const transactions: Transaction[] = await new Transaction(
      {},
      this.context,
    ).getTransactions(TransactionStatus.PENDING);

    console.info(
      'Number of transactions that needs to be checked on blockchain: ',
      transactions.length,
    );

    const txsByHash: Map<string, Transaction> = new Map<string, Transaction>(
      transactions.map((tx) => [tx.transactionHash, tx]),
    );

    for (let i = 0; i < input.data.length; i++) {
      const data = input.data[i];
      const dbTx = txsByHash.get(data.transactionHash);
      if (dbTx) {
        await this.updateTransactionStatus(dbTx, data);
        await this.updateCollectionStatus(dbTx, data);
      } else {
        console.log(
          `Transaction (txHash=${data.transactionHash}) not found in table!`,
        );
      }
    }
  }

  private async updateCollectionStatus(tx: Transaction, blockchainData) {
    if (tx.transactionStatus === TransactionStatus.FINISHED) {
      const collection: Collection = await new Collection(
        {},
        this.context,
      ).populateById(tx.refId);
      let isChanged = false;

      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        collection.collectionStatus = CollectionStatus.DEPLOYED;
        collection.contractAddress = blockchainData.data;
        isChanged = true;
      } else if (
        tx.transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP
      ) {
        collection.collectionStatus = CollectionStatus.TRANSFERED;
        isChanged = true;
      }
      if (isChanged) {
        collection.transactionHash = blockchainData.transactionHash;
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

  private async updateTransactionStatus(tx: Transaction, blockchainData) {
    // Transaction was mined (confirmed) but if its status is 0 - it failed on blockchain
    if (blockchainData.status == 2) {
      tx.transactionStatus = TransactionStatus.FINISHED;
      await tx.update();
      console.log(`Transaction (txHash=${tx.transactionHash}) CONFIRMED.`);
    } else if (blockchainData.status == 3) {
      tx.transactionStatus = TransactionStatus.FAILED;
      await tx.update();
      console.log(`Transaction (txHash=${tx.transactionHash}) is FAILED.`);
      // TODO: Notify admin on failed tx
    }
  }
}
