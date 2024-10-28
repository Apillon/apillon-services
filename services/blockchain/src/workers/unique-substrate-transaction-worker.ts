import { SubstrateTransactionWorker } from './substrate-transaction-worker';
import {
  LogType,
  PoolConnection,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import { DbTables, TransactionIndexerStatus } from '../config/types';
import { LogOutput } from '@apillon/workers-lib';
import { UniqueBlockchainIndexer } from '../modules/blockchain-indexers/substrate/unique/indexer.service';
import { encodeAddress } from '@polkadot/util-crypto';
import { SubstrateChainPrefix } from '@apillon/blockchain-lib/substrate';

/**
 * Worker which beside transfer transactions also fetches "collectionCreateds"
 * events to retrieve collection id from TX.
 */
export class UniqueJobTransactionWorker extends SubstrateTransactionWorker {
  protected indexer: UniqueBlockchainIndexer;

  protected async setTransactionsState(
    transactions: any[],
    walletAddress: string,
    conn: PoolConnection,
  ) {
    const successTransactions = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.SUCCESS)
      .map((t: any): string => t.extrinsicHash);
    // for unique we need to convert address from unique to address with prefix 42
    const convertedWalletAddress = encodeAddress(
      walletAddress,
      SubstrateChainPrefix.TESTNETS,
    );
    const collectionCreatedTxs =
      await this.indexer.getCollectionCreatedTransactions(
        convertedWalletAddress,
        successTransactions,
      );
    // Update CONTRACT transactions
    console.log(
      `Updating ${collectionCreatedTxs.length} collection created transactions`,
    );
    for (const jobRegistrationTx of collectionCreatedTxs) {
      await this.updateCollectionCreatedTransaction(
        jobRegistrationTx.extrinsicHash,
        jobRegistrationTx.collectionId,
        conn,
      );
      // remove transaction so we don't update it again bellow
      delete successTransactions[
        successTransactions.indexOf(jobRegistrationTx.extrinsicHash)
      ];
    }
    // Update SUCCESSFUL transactions
    console.log(
      `Updating ${successTransactions.length} other successful transactions`,
    );
    await this.updateTransactions(
      successTransactions,
      TransactionStatus.CONFIRMED,
      conn,
    );

    // Update FAILED transactions
    const failedTransactions: string[] = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.FAIL)
      .map((t: any): string => t.extrinsicHash);
    console.log(
      `Updating ${failedTransactions.length} other failed transactions`,
    );
    await this.updateTransactions(
      failedTransactions,
      TransactionStatus.FAILED,
      conn,
    );
  }

  protected async updateCollectionCreatedTransaction(
    transactionHash: string,
    collectionId: number,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
       SET transactionStatus = @status,
           data              = @collectionId
       WHERE chain = @chain
         AND transactionHash = @transactionHash`,
      {
        chain: this.chainId,
        transactionHash,
        status: TransactionStatus.CONFIRMED,
        collectionId,
      },
      conn,
    );
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message:
          `CONFIRMED blockchain transactions matched (txHash=${transactionHash})` +
          ` in db and got collection with id ${collectionId} assigned.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          chain: this.chainId,
          transactionHash,
          collectionId,
        },
      },
      LogOutput.EVENT_INFO,
    );
  }
}
