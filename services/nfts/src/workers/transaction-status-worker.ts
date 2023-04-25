import { Context, env, SqlModelStatus } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  CollectionStatus,
  DbTables,
  TransactionStatus,
  TransactionType,
} from '../config/types';
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
  public async runExecutor(input: any): Promise<any> {
    console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);

    const failedBcTxs: Map<string, any> = new Map<string, any>(
      input.data
        .filter((bcTx) => {
          return bcTx.status == 3;
        })
        .map((bcTx) => [bcTx.transactionHash, bcTx]),
    );
    const confirmedBcTxs: Map<string, any> = new Map<string, any>(
      input.data
        .filter((bcTx) => {
          return bcTx.status == 2;
        })
        .map((bcTx) => [bcTx.transactionHash, bcTx]),
    );

    const conn = await this.context.mysql.start();
    try {
      if (failedBcTxs.size) {
        await TransactionService.updateTransactionStatusInHashes(
          this.context,
          [...failedBcTxs.keys()],
          TransactionStatus.FAILED,
          conn,
        );
      }
      if (confirmedBcTxs.size) {
        await TransactionService.updateTransactionStatusInHashes(
          this.context,
          [...confirmedBcTxs.keys()],
          TransactionStatus.FINISHED,
          conn,
        );
        const updatedDbTxs: Transaction[] = await new Transaction(
          {},
          this.context,
        ).getTransactionsByHashes([...confirmedBcTxs.keys()]);

        for (const tx of updatedDbTxs) {
          await this.updateCollectionStatus(tx);
        }
      }
    } catch (err) {
      await conn.rollback();
    }
  }

  private async updateCollectionStatus(tx: Transaction) {
    if (tx.transactionStatus === TransactionStatus.FINISHED) {
      const collection: Collection = await new Collection(
        {},
        this.context,
      ).populateById(tx.refId);
      let isChanged = false;

      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        collection.collectionStatus = CollectionStatus.DEPLOYED;
        isChanged = true;
      } else if (
        tx.transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP
      ) {
        collection.collectionStatus = CollectionStatus.TRANSFERED;
        isChanged = true;
      }
      if (isChanged) {
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
