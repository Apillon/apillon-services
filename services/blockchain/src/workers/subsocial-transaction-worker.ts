import {
  LogType,
  PoolConnection,
  ServiceName,
  TransactionStatus,
  runWithWorkers,
} from '@apillon/lib';
import { SubstrateTransactionWorker } from './substrate-transaction-worker';
import { DbTables, TransactionIndexerStatus } from '../config/types';
import { LogOutput } from '@apillon/workers-lib';

export class SubsocialTransactionWorker extends SubstrateTransactionWorker {
  protected async fetchAllResolvedTransactions(
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const transactions: {
      transfers: any[];
      systems: any[];
      spaces: any[];
      posts: any[];
    } = await this.indexer.getAllTransactions(address, fromBlock, toBlock);

    //system events matches with spaces and posts event. Filter out such system events
    transactions.systems = transactions.systems.filter(
      (x) =>
        !transactions.spaces.find((s) => s.extrinsicHash == x.extrinsicHash) &&
        !transactions.posts.find((p) => p.extrinsicHash == x.extrinsicHash),
    );

    const transactionsArray: Array<any> = Object.values(transactions);
    return transactionsArray.length > 0 ? transactionsArray.flat(Infinity) : [];
  }

  protected async setTransactionsState(
    transactions: any[],
    _walletAddress: string,
    conn: PoolConnection,
  ) {
    // Update SUCCESSFUL transactions
    const successTransactions: any = transactions.filter(
      (t: any) => t.status == TransactionIndexerStatus.SUCCESS && !t.error,
    );
    await this.updateTransactionsAndSetDataProperty(
      successTransactions,
      TransactionStatus.CONFIRMED,
      conn,
    );

    // Update FAILED transactions
    const failedTransactions: string[] = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.FAIL || t.error)
      .map((t: any): string => t.extrinsicHash);
    await this.updateTransactions(
      failedTransactions,
      TransactionStatus.FAILED,
      conn,
    );
  }

  /**
   * For subsocial transactions, data property must be filled (with IDs of created elements on the chain)
   * @param transactions
   * @param status
   * @param conn
   */
  protected async updateTransactionsAndSetDataProperty(
    transactions: any[],
    status: TransactionStatus,
    conn: PoolConnection,
  ) {
    await runWithWorkers(
      transactions,
      20,
      this.context,
      async (transaction) => {
        if (transaction.transactionType == 'spaces-space-created') {
          transaction.data = transaction.spaceId;
        } else if (transaction.transactionType == 'posts-post-created') {
          transaction.data = transaction.postId;
        }

        await this.context.mysql.paramExecute(
          `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
            SET transactionStatus = @status
            ${transaction.data ? ', data = @data' : ''}    
                WHERE chain = @chain
                AND transactionHash = @transactionHash
            `,
          {
            chain: this.chainId,
            status,
            transactionHash: transaction.extrinsicHash,
            data: transaction.data,
          },
          conn,
        );
      },
    );

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `${transactions.length} [${
          TransactionStatus[status]
        }] blockchain transactions matched (txHashes=${transactions
          .map((x) => x.extrinsicHash)
          .join(`','`)}) in db.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          transactionHashes: transactions.map((x) => x.extrinsicHash),
          chain: this.chainId,
        },
      },
      LogOutput.EVENT_INFO,
    );
  }
}
