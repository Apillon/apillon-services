import { AppEnvironment, Context, env, SqlModelStatus } from '@apillon/lib';
import { Job, ServerlessWorker, WorkerDefinition } from '@apillon/workers-lib';
import {
  CollectionStatus,
  TransactionStatus,
  TransactionType,
} from '../config/types';
import { Collection } from '../modules/nfts/models/collection.model';
import { Transaction } from '../modules/transaction/models/transaction.model';
import { WalletService } from '../modules/wallet/wallet.service';

export class TransactionStatusWorker extends ServerlessWorker {
  private context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`TransactionStatusWorker - execute BEGIN: ${data}`);
    //Get all transaction, that were sent to blockchain
    const transactions: Transaction[] = await new Transaction(
      {},
      this.context,
    ).getTransactions(TransactionStatus.PENDING);

    console.info(
      'Number of transactions that needs to be checked on blockchain: ',
      transactions.length,
    );
    const walletService: WalletService = new WalletService();

    for (const tx of transactions) {
      const txReceipt = await walletService.getTransactionByHash(
        tx.transactionHash,
      );
      console.log(
        `Checking transaction (txId = ${tx.id}, txHash = ${txReceipt.transactionHash}, confirmations = ${txReceipt.confirmations})`,
      );
      const isConfirmed: boolean = await walletService.isTransacionConfirmed(
        txReceipt,
      );

      if (isConfirmed) {
        // Update transaction status based on blockchain data - txRecepit
        await this.updateTransactionStatus(tx, txReceipt);
        // Update NFT collection with contractAddress
        await this.updateCollectionStatus(tx, txReceipt);
      }
    }
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`DeleteBucketDirectoryFileWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`DeleteBucketDirectoryFileWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
    // this.logFn('DeleteBucketDirectoryFileWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private async updateCollectionStatus(tx: Transaction, txReceipt) {
    if (tx.transactionStatus === TransactionStatus.FINISHED) {
      const collection: Collection = await new Collection(
        {},
        this.context,
      ).populateById(tx.refId);
      let isChanged = false;

      if (tx.transactionType === TransactionType.DEPLOY_CONTRACT) {
        collection.collectionStatus = CollectionStatus.DEPLOYED;
        collection.contractAddress = txReceipt.contractAddress;
        isChanged = true;
      } else if (
        tx.transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP
      ) {
        collection.collectionStatus = CollectionStatus.TRANSFERED;
        isChanged = true;
      }
      if (isChanged) {
        collection.transactionHash = txReceipt.transactionHash;
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

  private async updateTransactionStatus(tx: Transaction, txReceipt) {
    // Transaction was mined (confirmed) but if its status is 0 - it failed on blockchain
    if (txReceipt.status) {
      tx.transactionStatus = TransactionStatus.FINISHED;
      await tx.update();
      console.log(`Transaction (txHash=${tx.transactionHash}) CONFIRMED.`);
    } else {
      tx.transactionStatus = TransactionStatus.FAILED;
      await tx.update();
      console.log(`Transaction (txHash=${tx.transactionHash}) is FAILED.`);
      // TODO: Notify admin on failed tx
    }
  }
}
