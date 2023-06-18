import {
  ChainType,
  Context,
  env,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  sendToWorkerQueue,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../common/models/wallet';
import { DbTables } from '../config/types';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import { KiltTransactions } from '../modules/blockchain-indexers/substrate/kilt/data-models/kilt-transactions';
import { WorkerName } from './worker-executor';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';

export class KiltTransactionWorker extends BaseSingleThreadWorker {
  private logPrefix: string;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(_data: any): Promise<any> {
    const wallets = await new Wallet({}, this.context).getList(
      SubstrateChain.KILT,
      ChainType.SUBSTRATE,
    );

    this.logPrefix = `[SUBSTRATE][KILT]`;

    console.info(`${this.logPrefix} RUN EXECUTOR (KiltTransactionWorker).`);

    for (const w of wallets) {
      const conn = await this.context.mysql.start();

      try {
        const wallet: Wallet = new Wallet(w, this.context);
        const kiltIndexer: KiltBlockchainIndexer = new KiltBlockchainIndexer();
        const blockHeight = await kiltIndexer.getBlockHeight();

        const lastParsedBlock: number = wallet.lastParsedBlock;
        const toBlock: number =
          lastParsedBlock + wallet.blockParseSize < blockHeight
            ? lastParsedBlock + wallet.blockParseSize
            : blockHeight;

        console.log(
          `[SUBSTRATE][KILT] Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
        );

        const kiltTransactions = await this.fetchAllKiltTransactions(
          kiltIndexer,
          wallet.address,
          lastParsedBlock,
          toBlock,
        );

        /*await this.handleBlockchainTransfers(
          wallet,
          kiltTransactions.withdrawals,
          kiltTransactions.deposits,
          conn,
        );
        await this.handleKiltFileOrders(
          wallet,
          kiltTransactions.fileOrders,
          conn,
        );*/

        await wallet.updateLastParsedBlock(toBlock, conn);
        await conn.commit();

        if (kiltTransactions.withdrawals.transfers.length > 0) {
          await sendToWorkerQueue(
            env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
            WorkerName.TRANSACTION_WEBHOOKS,
            [{}],
            null,
            null,
          );
          await this.writeLogToDb(
            WorkerLogStatus.INFO,
            'Found new transactions. Triggering transaction webhook worker!',
            {
              transfers: kiltTransactions.withdrawals.transfers,
              wallet: wallet.address,
            },
          );
        }
        console.log(
          `[SUBSTRATE][KILT] Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${toBlock}) FINISHED!`,
        );
      } catch (err) {
        await conn.rollback();

        await this.writeLogToDb(
          WorkerLogStatus.ERROR,
          'Checking transactions FAILED!',
          { wallet: wallets.address },
          err,
        );
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Error confirming transactions',
          location: 'KiltTransactionWorker',
          service: ServiceName.BLOCKCHAIN,
          data: {
            error: err,
            wallet: wallets.address,
          },
        });
        await new Lmas().sendAdminAlert(
          `${this.logPrefix}: Error confirming transactions!`,
          ServiceName.BLOCKCHAIN,
          'alert',
        );
      }
    }
  }

  public async handleKiltDeposits(deposits: KiltTransfers, wallet: Wallet) {
    if (!deposits.transfers.length) {
      console.log(
        `[SUBSTRATE][KILT] There are no new deposits to wallet (address=${wallet.address}).`,
      );
      return;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Detecting ${deposits.transfers.length} blockchain deposit(s) to ${wallet}.`,
      {
        wallet,
      },
    );

    deposits.transfers.forEach((bcTx) => {
      // TODO: Send notification of a new deposit to a wallet address and save to accounting table
    });
  }

  // /**
  //  * Handling blockchain withdrawals/deposits
  //  *
  //  * @param sourceWallet wallet from/to transaction happened
  //  * @param pendingDbTxs pending transactions in db
  //  */
  // public async handleBlockchainTransfers(
  //   wallet: Wallet,
  //   withdrawals: KiltTransfers,
  //   deposits: KiltTransfers,
  //   conn: PoolConnection,
  // ) {
  //   await this.handleKiltWithdrawals(withdrawals, wallet, conn);
  //   await this.handleKiltDeposits(deposits, wallet);
  // }

  // public async handleKiltWithdrawals(
  //   withdrawals: KiltTransfers,
  //   wallet: Wallet,
  //   conn: PoolConnection,
  // ) {
  //   if (!withdrawals.transfers.length) {
  //     console.log(
  //       `[SUBSTRATE][KILT] There are no new withdrawals received from blockchain indexer (address=${wallet.address}).`,
  //     );
  //     return;
  //   }

  //   await this.writeLogToDb(
  //     WorkerLogStatus.INFO,
  //     `Matching ${withdrawals.transfers.length} blockchain transactions with transactions in DB.`,
  //     {
  //       transfers: withdrawals.transfers,
  //     },
  //   );

  //   const confirmedDbTxHashes: string[] = await this.updateWithdrawalsByStatus(
  //     withdrawals,
  //     TransactionStatus.CONFIRMED,
  //     wallet,
  //     conn,
  //   );
  //   const failedDbTxHashes: string[] = await this.updateWithdrawalsByStatus(
  //     withdrawals,
  //     TransactionStatus.FAILED,
  //     wallet,
  //     conn,
  //   );

  //   const updatedDbTxs = confirmedDbTxHashes.concat(failedDbTxHashes);

  //   // All transactions were matched with db
  //   if (withdrawals.transfers.length == updatedDbTxs.length) {
  //     return;
  //   }

  //   withdrawals.transfers.forEach((bcTx) => {
  //     if (!updatedDbTxs.includes(bcTx.extrinsicHash)) {
  //       // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
  //       // use info from value variable to get all required data
  //     }
  //   });
  // }

  // /**
  //  * Updates transaction statuses which are confirmed on blockchain
  //  *
  //  * @param bcHashes blockhain hashes array
  //  * @param wallet wallet entity
  //  * @param conn connection
  //  * @returns array of confirmed transaction hashes
  //  */
  // public async updateTransactions(
  //   bcHashes: string[],
  //   status: TransactionStatus,
  //   wallet: Wallet,
  //   conn: PoolConnection,
  // ): Promise<string[]> {
  //   await this.context.mysql.paramExecute(
  //     `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
  //       SET transactionStatus = @status
  //       WHERE
  //         chain = @chain
  //         AND chainType = @chainType
  //         AND address = @address
  //         AND transactionHash in ('${bcHashes.join("','")}')`,
  //     {
  //       status,
  //       chain: wallet.chain,
  //       address: wallet.address,
  //       chainType: wallet.chainType,
  //     },
  //     conn,
  //   );

  //   return (
  //     await new Transaction({}, this.context).getTransactionsByHashes(
  //       wallet.chain,
  //       wallet.chainType,
  //       wallet.address,
  //       status,
  //       bcHashes,
  //       conn,
  //     )
  //   ).map((tx) => {
  //     return tx.transactionHash;
  //   });
  // }

  // public async updateWithdrawalsByStatus(
  //   withdrawals: KiltTransfers,
  //   status: TransactionStatus,
  //   wallet: Wallet,
  //   conn: PoolConnection,
  // ): Promise<string[]> {
  //   const bcStatus: BlockchainStatus =
  //     status == TransactionStatus.CONFIRMED
  //       ? BlockchainStatus.CONFIRMED
  //       : BlockchainStatus.FAILED;

  //   const bcWithdrawals = new Map<string, KiltTransfer>(
  //     withdrawals.transfers
  //       .filter((tx) => {
  //         return tx.status == bcStatus;
  //       })
  //       .map((w) => [w.extrinsicHash, w]),
  //   );

  //   const bcHashes: string[] = [...bcWithdrawals.keys()];
  //   const updatedDbTxs: string[] = await this.updateTransactions(
  //     bcHashes,
  //     status,
  //     wallet,
  //     conn,
  //   );

  //   const txDbHashesString = updatedDbTxs.join(',');
  //   console.log(
  //     `[SUBSTRATE][KILT] ${updatedDbTxs.length} [${TransactionStatus[status]}] transactions matched (txHashes=${txDbHashesString}) in db.`,
  //   );
  //   await this.writeLogToDb(
  //     WorkerLogStatus.SUCCESS,
  //     `${updatedDbTxs.length} [${TransactionStatus[status]}] transactions matched in db.`,
  //     {
  //       txDbHashesString,
  //     },
  //   );

  //   return updatedDbTxs;
  // }

  // /**
  //  * Obtain kilt transactions
  //  * @param address transactions created from wallet address
  //  * @param fromBlock transactions included from block number
  //  * @param toBlock transactions included to block number
  //  */
  // public async fetchAllKiltTransactions(
  //   kiltIndexer: KiltBlockchainIndexer,
  //   address: string,
  //   fromBlock: number,
  //   toBlock: number,
  // ) {
  //   const withdrawals = await kiltIndexer.getWalletWithdrawals(
  //     address,
  //     fromBlock,
  //     toBlock,
  //   );
  //   const deposits = await kiltIndexer.getWalletDeposits(
  //     address,
  //     fromBlock,
  //     toBlock,
  //   );
  //   return { withdrawals, deposits };
  // }
}
