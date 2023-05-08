import {
  ChainType,
  Context,
  env,
  Lmas,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  sendToWorkerQueue,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../common/models/wallet';
import { DbTables } from '../config/types';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust-indexer.service';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import {
  CrustStorageOrders,
  CrustStorageOrder,
} from '../modules/blockchain-indexers/substrate/data-models/crust-storage-orders';
import {
  CrustTransfer,
  CrustTransfers,
} from '../modules/blockchain-indexers/substrate/data-models/crust-transfers';
import { WorkerName } from './worker-executor';

export class CrustTransactionWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(_data: any): Promise<any> {
    console.info('RUN EXECUTOR (CrustTransactionWorker).');

    const wallets = await new Wallet({}, this.context).getList(
      SubstrateChain.CRUST,
      ChainType.SUBSTRATE,
    );

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

        await new Lmas().writeLog({
          logType: LogType.INFO,
          message: 'Checking [SUBSTRATE][CRUST] pending transactions..',
          location: 'CrustTransactionWorker',
          service: ServiceName.BLOCKCHAIN,
          data: {
            wallet: wallet.address,
            fromBlock: lastParsedBlock,
            toBlock,
          },
        });

        console.log(
          `[SUBSTRATE][CRUST] Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
        );

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
          conn,
        );
        await this.handleCrustFileOrders(
          wallet,
          crustTransactions.fileOrders,
          conn,
        );

        wallet.lastParsedBlock = toBlock;
        await wallet.update(SerializeFor.UPDATE_DB, conn);
        await conn.commit();
        console.log(
          `[SUBSTRATE][CRUST] Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${toBlock}) FINISHED!`,
        );
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
        }
        await new Lmas().writeLog({
          logType: LogType.INFO,
          message: 'Checking [SUBSTRATE][CRUST] pending transactions finished!',
          location: 'CrustTransactionWorker',
          service: ServiceName.BLOCKCHAIN,
          data: {
            wallet: wallets.address,
            fromBlock: lastParsedBlock,
            toBlock,
          },
        });
      } catch (err) {
        await conn.rollback();
        console.error(
          `[SUBSTRATE][CRUST] Checking PENDING transactions (sourceWallet=${w.address}) FAILED! Error: ${err}`,
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
    conn: PoolConnection,
  ) {
    await this.handleCrustWithdrawals(withdrawals, wallet, conn);
    await this.handleCrustDeposits(deposits, wallet);
  }

  public async handleCrustWithdrawals(
    withdrawals: CrustTransfers,
    wallet: Wallet,
    conn: PoolConnection,
  ) {
    if (!withdrawals.transfers.length) {
      console.log(
        `[SUBSTRATE][CRUST] There are no new withdrawals received from blockchain indexer (address=${wallet.address}).`,
      );
      return;
    }
    console.log(
      `[SUBSTRATE][CRUST] Matching ${withdrawals.transfers.length} blockchain transactions with transactions in DB.`,
    );

    const confirmedDbTxHashes: string[] = await this.updateWithdrawalsByStatus(
      withdrawals,
      TransactionStatus.CONFIRMED,
      wallet,
      conn,
    );
    const failedDbTxHashes: string[] = await this.updateWithdrawalsByStatus(
      withdrawals,
      TransactionStatus.FAILED,
      wallet,
      conn,
    );

    const updatedDbTxs = confirmedDbTxHashes.concat(failedDbTxHashes);

    // All transactions were matched with db
    if (withdrawals.transfers.length == updatedDbTxs.length) {
      return;
    }

    withdrawals.transfers.forEach((bcTx) => {
      if (!updatedDbTxs.includes(bcTx.extrinsicHash)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
      }
    });
  }

  public async handleCrustDeposits(
    deposits: CrustTransfers,
    wallet: Wallet,
    conn?: PoolConnection,
  ) {
    if (!deposits.transfers.length) {
      console.log(
        `[SUBSTRATE][CRUST] There are no new deposits to wallet (address=${wallet.address}).`,
      );
      return;
    }
    console.log(
      `[SUBSTRATE][CRUST] Received ${deposits.transfers.length} deposits from blockchain indexer.`,
    );

    deposits.transfers.forEach((bcTx) => {
      // TODO: Send notification of a new deposit to a wallet address and save to accounting table
    });
  }

  public async handleCrustFileOrders(
    wallet: Wallet,
    bcOrders: CrustStorageOrders,
    conn: PoolConnection,
  ) {
    if (!bcOrders.storageOrders.length) {
      console.log(
        `[SUBSTRATE][CRUST] There are no new file storage orders received from blockchain indexer (address=${wallet.address}).`,
      );
      return;
    }
    console.log(
      `[SUBSTRATE][CRUST] Matching ${bcOrders.storageOrders.length} blockchain storage orders with transactions in DB.`,
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

    bcOrders.storageOrders.forEach((bcTx) => {
      if (!updatedDbTxs.includes(bcTx.extrinsicHash)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
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

  public async updateWithdrawalsByStatus(
    withdrawals: CrustTransfers,
    status: TransactionStatus,
    wallet: Wallet,
    conn: PoolConnection,
  ): Promise<string[]> {
    const bcStatus: BlockchainStatus =
      status == TransactionStatus.CONFIRMED
        ? BlockchainStatus.CONFIRMED
        : BlockchainStatus.FAILED;

    const bcWithdrawals = new Map<string, CrustTransfer>(
      withdrawals.transfers
        .filter((tx) => {
          return tx.status == bcStatus;
        })
        .map((w) => [w.extrinsicHash, w]),
    );

    const bcHashes: string[] = [...bcWithdrawals.keys()];
    const updatedDbTxs: string[] = await this.updateTransactions(
      bcHashes,
      status,
      wallet,
      conn,
    );

    const txDbHashesString = updatedDbTxs.join(',');
    console.log(
      `[SUBSTRATE][CRUST] ${updatedDbTxs.length} [${TransactionStatus[status]}] transactions matched (txHashes=${txDbHashesString}) in db.`,
    );

    return updatedDbTxs;
  }

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
    const withdrawals = await crustIndexer.getWalletWitdrawals(
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
