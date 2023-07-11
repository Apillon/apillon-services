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
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/crust-indexer.service';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import {
  CrustStorageOrders,
  CrustStorageOrder,
} from '../modules/blockchain-indexers/substrate/crust/data-models/crust-storage-orders';
import { CrustTransfers } from '../modules/blockchain-indexers/substrate/crust/data-models/crust-transfers';
import { WorkerName } from './worker-executor';

export class CrustTransactionWorker extends BaseSingleThreadWorker {
  private logPrefix: string;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(_data: any): Promise<any> {
    const wallets = await new Wallet({}, this.context).getList(
      SubstrateChain.CRUST,
      ChainType.SUBSTRATE,
    );

    this.logPrefix = `[SUBSTRATE][CRUST]`;

    // console.info(`${this.logPrefix} RUN EXECUTOR (CrustTransactionWorker).`);

    for (const w of wallets) {
      const conn = await this.context.mysql.start();
      try {
        const wallet: Wallet = new Wallet(w, this.context);
        const crustIndexer: CrustBlockchainIndexer =
          new CrustBlockchainIndexer();
        const blockHeight = await crustIndexer.getBlockHeight();

        const lastParsedBlock: number = wallet.lastParsedBlock;
        const toBlock: number =
          lastParsedBlock + wallet.blockParseSize < blockHeight
            ? lastParsedBlock + wallet.blockParseSize
            : blockHeight;

        // console.log(
        //   `[SUBSTRATE][CRUST] Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
        // );

        const crustTransactions = await this.fetchAllCrustTransactions(
          crustIndexer,
          wallet.address,
          lastParsedBlock,
          toBlock,
        );

        await this.handleBlockchainTransfers(
          wallet,
          crustTransactions.withdrawals,
          crustTransactions.deposits,
        );

        await this.handleCrustFileOrders(
          wallet,
          crustTransactions.fileOrders,
          conn,
        );

        await wallet.updateLastParsedBlock(toBlock, conn);
        await conn.commit();

        if (
          crustTransactions.fileOrders.storageOrders.length > 0 ||
          crustTransactions.withdrawals.transfers.length > 0
        ) {
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
              storageOrders: crustTransactions.fileOrders.storageOrders,
              transfers: crustTransactions.withdrawals.transfers,
              wallet: wallet.address,
            },
          );
        }
        // console.log(
        //   `[SUBSTRATE][CRUST] Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${toBlock}) FINISHED!`,
        // );
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
          location: 'CrustTransactionWorker',
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

  /**
   * Handling blockchain withdrawals/deposits
   *
   * @param sourceWallet wallet from/to transaction happened
   * @param pendingDbTxs pending transactions in db
   */
  public async handleBlockchainTransfers(
    wallet: Wallet,
    withdrawals: CrustTransfers,
    deposits: CrustTransfers,
  ) {
    await this.handleCrustWithdrawals(withdrawals, wallet);
    await this.handleCrustDeposits(deposits, wallet);
  }

  public async handleCrustWithdrawals(
    withdrawals: CrustTransfers,
    wallet: Wallet,
    // conn: PoolConnection,
  ) {
    if (!withdrawals.transfers.length) {
      // console.log(
      //   `[SUBSTRATE][CRUST] There are no new withdrawals received from blockchain indexer (address=${wallet.address}).`,
      // );
      return;
    }

    await this.writeLogToDb(
      WorkerLogStatus.WARNING,
      `Detecting ${withdrawals.transfers.length} withdrawal from ${wallet.address}!!!`,
      {
        wallet,
        transfers: withdrawals.transfers,
      },
    );

    await new Lmas().writeLog({
      logType: LogType.WARN,
      message: `Detecting ${withdrawals.transfers.length} withdrawals from ${wallet.address}!!!`,
      location: 'CrustTransactionWorker',
      service: ServiceName.BLOCKCHAIN,
      data: {
        wallet: wallet.address,
      },
    });
    await new Lmas().sendAdminAlert(
      `${this.logPrefix}: Detecting ${withdrawals.transfers.length} withdrawals from ${wallet.address}!!!`,
      ServiceName.BLOCKCHAIN,
      'warning',
    );

    /**
     * Withdrawals are not supposed to be in the transaction queue, so we only send notifications when detected.
     */

    // const confirmedDbTxHashes: string[] = await this.updateWithdrawalsByStatus(
    //   withdrawals,
    //   TransactionStatus.CONFIRMED,
    //   wallet,
    //   conn,
    // );
    // const failedDbTxHashes: string[] = await this.updateWithdrawalsByStatus(
    //   withdrawals,
    //   TransactionStatus.FAILED,
    //   wallet,
    //   conn,
    // );

    // const updatedDbTxs = confirmedDbTxHashes.concat(failedDbTxHashes);

    // // All transactions were matched with db
    // if (withdrawals.transfers.length == updatedDbTxs.length) {
    //   return;
    // }

    // withdrawals.transfers.forEach((bcTx) => {
    //   if (!updatedDbTxs.includes(bcTx.extrinsicHash)) {
    //     // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
    //     // use info from value variable to get all required data
    //   }
    // });
  }

  public async handleCrustDeposits(deposits: CrustTransfers, wallet: Wallet) {
    if (!deposits.transfers.length) {
      // console.log(
      //   `[SUBSTRATE][CRUST] There are no new deposits to wallet (address=${wallet.address}).`,
      // );
      return;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Detecting ${deposits.transfers.length} deposit(s) to ${wallet}.`,
      {
        wallet,
        transfers: deposits.transfers,
      },
    );
    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: `Detecting ${deposits.transfers.length} deposits to ${wallet.address}.`,
      location: 'CrustTransactionWorker',
      service: ServiceName.BLOCKCHAIN,
      data: {
        wallet: wallet.address,
      },
    });
    await new Lmas().sendAdminAlert(
      `${this.logPrefix}: Detecting ${deposits.transfers.length} deposits to ${wallet.address}.`,
      ServiceName.BLOCKCHAIN,
      'message',
    );

    // deposits.transfers.forEach((bcTx) => {
    //   // TODO: Send notification of a new deposit to a wallet address and save to accounting table
    // });
  }

  public async handleCrustFileOrders(
    wallet: Wallet,
    bcOrders: CrustStorageOrders,
    conn: PoolConnection,
  ) {
    if (!bcOrders.storageOrders.length) {
      // console.log(
      //   `${this.logPrefix} There are no new file storage orders received from blockchain indexer (address=${wallet.address}).`,
      // );
      return;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Matching ${bcOrders.storageOrders.length} blockchain storage orders with transactions in DB.`,
      {
        wallet,
        bcOrders,
      },
    );

    const confirmedDbTxHashes: string[] =
      await this.updateStorageOrdersByStatus(
        bcOrders,
        TransactionStatus.CONFIRMED,
        wallet,
        conn,
      );

    const failedDbTxHashes: string[] = await this.updateStorageOrdersByStatus(
      bcOrders,
      TransactionStatus.FAILED,
      wallet,
      conn,
    );

    const updatedDbTxs = confirmedDbTxHashes.concat(failedDbTxHashes);
    // All transactions were matched with db
    if (bcOrders.storageOrders.length === updatedDbTxs.length) {
      return;
    }

    bcOrders.storageOrders.forEach(async (bcTx) => {
      if (!updatedDbTxs.includes(bcTx.extrinsicHash)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
        await new Lmas().sendAdminAlert(
          `${this.logPrefix}: Detecting unauthorized transactions from ${wallet.address}!`,
          ServiceName.BLOCKCHAIN,
          'alert',
        );
        await new Lmas().writeLog({
          logType: LogType.WARN,
          message: `Detecting unauthorized transactions from ${wallet.address}!`,
          location: 'CrustTransactionWorker',
          service: ServiceName.BLOCKCHAIN,
          data: {
            tx: bcTx,
          },
        });
      }
    });
  }

  /**
   * Updates transaction statuses which are confirmed on blockchain
   *
   * @param bcHashes blockhain hashes array
   * @param wallet wallet entity
   * @param conn connection
   * @returns array of confirmed transaction hashes
   */
  public async updateTransactions(
    bcHashes: string[],
    status: TransactionStatus,
    wallet: Wallet,
    conn: PoolConnection,
  ): Promise<string[]> {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
      SET transactionStatus = @status
      WHERE
        chain = @chain
        AND chainType = @chainType
        AND address = @address
        AND transactionHash in ('${bcHashes.join("','")}')`,
      {
        status,
        chain: wallet.chain,
        address: wallet.address,
        chainType: wallet.chainType,
      },
      conn,
    );

    return (
      await new Transaction({}, this.context).getTransactionsByHashes(
        wallet.chain,
        wallet.chainType,
        wallet.address,
        status,
        bcHashes,
        conn,
      )
    ).map((tx) => {
      return tx.transactionHash;
    });
  }

  // public async updateWithdrawalsByStatus(
  //   withdrawals: CrustTransfers,
  //   status: TransactionStatus,
  //   wallet: Wallet,
  //   conn: PoolConnection,
  // ): Promise<string[]> {
  //   const bcStatus: BlockchainStatus =
  //     status == TransactionStatus.CONFIRMED
  //       ? BlockchainStatus.CONFIRMED
  //       : BlockchainStatus.FAILED;

  //   const bcWithdrawals = new Map<string, CrustTransfer>(
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
  //     `[SUBSTRATE][CRUST] ${updatedDbTxs.length} [${TransactionStatus[status]}] transactions matched (txHashes=${txDbHashesString}) in db.`,
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

  public async updateStorageOrdersByStatus(
    bcOrders: CrustStorageOrders,
    status: TransactionStatus,
    wallet: Wallet,
    conn: PoolConnection,
  ): Promise<string[]> {
    const bcStatus: BlockchainStatus =
      status == TransactionStatus.CONFIRMED
        ? BlockchainStatus.CONFIRMED
        : BlockchainStatus.FAILED;

    const storageOrders = new Map<string, CrustStorageOrder>(
      bcOrders.storageOrders
        .filter((so) => {
          return so.status == bcStatus;
        })
        .map((so) => [so.extrinsicHash, so]),
    );

    const soHashes: string[] = [...storageOrders.keys()];
    const updatedDbTxs: string[] = await this.updateTransactions(
      soHashes,
      status,
      wallet,
      conn,
    );

    const txDbHashesString = updatedDbTxs.join(',');
    console.log(
      `[SUBSTRATE][CRUST] ${updatedDbTxs.length} [${TransactionStatus[status]}] storage orders matched (txHashes=${txDbHashesString}) in db.`,
    );
    await this.writeLogToDb(
      WorkerLogStatus.SUCCESS,
      `${updatedDbTxs.length} [${TransactionStatus[status]}] storage orders matched in db.`,
      {
        txDbHashesString,
      },
    );
    return updatedDbTxs;
  }

  /**
   * Obtain crust transactions
   * @param address transactions created from wallet address
   * @param fromBlock transactions included from block number
   * @param toBlock transactions included to block number
   */
  public async fetchAllCrustTransactions(
    crustIndexer: CrustBlockchainIndexer,
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const withdrawals = await crustIndexer.getWalletWithdrawals(
      address,
      fromBlock,
      toBlock,
    );
    const deposits = await crustIndexer.getWalletDeposits(
      address,
      fromBlock,
      toBlock,
    );
    const fileOrders = await crustIndexer.getMarketFileOrders(
      address,
      fromBlock,
      toBlock,
    );
    return { withdrawals, deposits, fileOrders };
  }
}
