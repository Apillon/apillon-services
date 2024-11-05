import { SubstrateTransactionWorker } from './substrate-transaction-worker';
import {
  LogType,
  PoolConnection,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import { DbTables, TransactionIndexerStatus } from '../config/types';
import { LogOutput } from '@apillon/workers-lib';
import { BaseBlockchainIndexer } from '../modules/blockchain-indexers/substrate/base-blockchain-indexer';

/**
 * Worker which beside transfer transactions also fetches "Instantiating" events
 * to retrieve contract address from TX.
 */
export class SubstrateContractTransactionWorker extends SubstrateTransactionWorker {
  protected indexer: BaseBlockchainIndexer = undefined;

  protected async setTransactionsState(
    transactions: any[],
    walletAddress: string,
    conn: PoolConnection,
  ) {
    const successTransactions = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.SUCCESS)
      .map((t: any): string => t.extrinsicHash);
    const contractTransactions = await this.indexer.getContractTransactions(
      walletAddress,
      successTransactions,
    );
    // Update CONTRACT transactions
    console.log(
      `Updating ${contractTransactions.length} contract instantiated transactions`,
    );
    for (const contractTransaction of contractTransactions) {
      await this.updateContractTransaction(
        contractTransaction.extrinsicHash,
        contractTransaction.contract,
        conn,
      );
      // remove transaction so we don't update it again bellow
      delete successTransactions[
        successTransactions.indexOf(contractTransaction.extrinsicHash)
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
      `Updating ${failedTransactions.length} other successful transactions`,
    );
    await this.updateTransactions(
      failedTransactions,
      TransactionStatus.FAILED,
      conn,
    );
  }

  protected async updateContractTransaction(
    transactionHash: string,
    contractAddress: string,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
       SET transactionStatus = @status,
           data              = @contractAddress
       WHERE chain = @chain
         AND transactionHash = @transactionHash`,
      {
        chain: this.chainId,
        transactionHash,
        status: TransactionStatus.CONFIRMED,
        contractAddress,
      },
      conn,
    );
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message:
          `CONFIRMED blockchain transactions matched (txHash=${transactionHash})` +
          ` in db and got contract id ${contractAddress} assigned.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          chain: this.chainId,
          transactionHash,
          contractAddress,
        },
      },
      LogOutput.EVENT_INFO,
    );
  }
}
