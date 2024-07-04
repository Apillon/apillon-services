import { SubstrateTransactionWorker } from './substrate-transaction-worker';
import {
  LogType,
  PoolConnection,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import { DbTables, TransactionIndexerStatus } from '../config/types';
import { LogOutput } from '@apillon/workers-lib';
import { AcurastBlockchainIndexer } from '../modules/blockchain-indexers/substrate/acurast/indexer.service';

/**
 * Worker which beside transfer transactions also fetches "JobRegistrationStored"
 * events to retrieve contract address from TX.
 */
export class AcurastJobTransactionWorker extends SubstrateTransactionWorker {
  protected indexer: AcurastBlockchainIndexer;

  protected async setTransactionsState(
    transactions: any[],
    walletAddress: string,
    conn: PoolConnection,
  ) {
    const successTransactions = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.SUCCESS)
      .map((t: any): string => t.extrinsicHash);
    const jobRegistrationTxs =
      await this.indexer.getJobRegistrationTransactions(
        walletAddress,
        successTransactions,
      );
    // Update CONTRACT transactions
    console.log(
      `Updating ${jobRegistrationTxs.length} contract instantiated transactions`,
    );
    for (const jobRegistrationTx of jobRegistrationTxs) {
      await this.updateJobRegistrationStoredTransaction(
        jobRegistrationTx.extrinsicHash,
        jobRegistrationTx.jobId,
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
      `Updating ${failedTransactions.length} other successful transactions`,
    );
    await this.updateTransactions(
      failedTransactions,
      TransactionStatus.FAILED,
      conn,
    );
  }

  protected async updateJobRegistrationStoredTransaction(
    transactionHash: string,
    jobId: string,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
       SET transactionStatus = @status,
           data              = @jobId
       WHERE chain = @chain
         AND transactionHash = @transactionHash`,
      {
        chain: this.chainId,
        transactionHash,
        status: TransactionStatus.CONFIRMED,
        jobId,
      },
      conn,
    );
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message:
          `CONFIRMED blockchain transactions matched (txHash=${transactionHash})` +
          ` in db and got job id ${jobId} assigned.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          chain: this.chainId,
          transactionHash,
          jobId,
        },
      },
      LogOutput.EVENT_INFO,
    );
  }
}
