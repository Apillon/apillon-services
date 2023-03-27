import {
  ChainType,
  Context,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { BaseSingleThreadWorker, WorkerDefinition } from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../common/models/wallet';
import { DbTables } from '../config/types';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/crust-indexer.service';
import {
  CrustStorageOrders,
  CrustStorageOrder,
} from '../modules/blockchain-indexers/data-models/crust-storage-orders';
import {
  CrustTransfer,
  CrustTransfers,
} from '../modules/blockchain-indexers/data-models/crust-transfers';

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

    const maxBlocks = 50;

    for (const wallet of wallets) {
      const conn = await this.context.mysql.start();
      try {
        const crustIndexer: CrustBlockchainIndexer =
          new CrustBlockchainIndexer();
        const blockHeight = await crustIndexer.getBlockHeight();

        const lastParsedBlock: number = wallet.lastParsedBlock;
        const toBlock: number =
          lastParsedBlock + maxBlocks < blockHeight
            ? lastParsedBlock + maxBlocks
            : blockHeight;

        console.log(
          `Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
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
        await wallet.update();
        await conn.commit();
        console.log(
          `Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${toBlock}) FINISHED!`,
        );
      } catch (err) {
        await conn.rollback();
        console.log(
          `Checking PENDING transactions (sourceWallet=${wallet.address}) FAILED! Error: ${err}`,
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
        `There are no new withdrawals received from blockchain indexer (address=${wallet.address}).`,
      );
      return;
    }
    const withdrawalsByHash = new Map<string, CrustTransfer>(
      withdrawals.transfers.map((w) => [w.extrinsicHash, w]),
    );
    const bcHashesString: string = [...withdrawalsByHash.keys()].join(',');
    console.log(
      `Matching ${withdrawals.transfers.length} blockchain transactions with transactions in DB. (txHashes=${bcHashesString})`,
    );
    const confirmedDbTxHashes: string[] =
      await this.updateConfirmedTransactions(bcHashesString, wallet, conn);

    const txDbHashesString = confirmedDbTxHashes.join(',');
    console.log(
      `${confirmedDbTxHashes.length} Transactions matched (txHashes=${txDbHashesString}) in db.`,
    );

    // All transactions were matched with db
    if (withdrawalsByHash.entries.length === confirmedDbTxHashes.length) {
      return;
    }

    withdrawalsByHash.forEach((value, key) => {
      if (!confirmedDbTxHashes.includes(key)) {
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
        `There are no new deposits to wallet (address=${wallet.address}).`,
      );
      return;
    }
    console.log(
      `Received ${deposits.transfers.length} deposits from blockchain indexer.`,
    );

    deposits.transfers.forEach((bcTx) => {
      // TODO: Send notification of a new deposit to a wallet address and save to accounting table
    });
  }

  public async handleCrustFileOrders(
    wallet: Wallet,
    bcFileOrders: CrustStorageOrders,
    conn: PoolConnection,
  ) {
    if (!bcFileOrders.storageOrders.length) {
      console.log(
        `There are no new file storage orders received from blockchain indexer (address=${wallet.address}).`,
      );
      return;
    }
    const bcFileOrdersByHash = new Map<string, CrustStorageOrder>(
      bcFileOrders.storageOrders.map((so) => [so.extrinsicHash, so]),
    );
    const bcHashesString: string = [...bcFileOrdersByHash.keys()].join(',');
    console.log(
      `Matching ${bcFileOrders.storageOrders.length} blockchain storage orders with transactions in DB. (txHashes=${bcHashesString})`,
    );

    const confirmedDbTxHashes: string[] =
      await this.updateConfirmedTransactions(bcHashesString, wallet, conn);

    // All transactions were matched with db
    if (bcFileOrdersByHash.entries.length === confirmedDbTxHashes.length) {
      return;
    }

    bcFileOrdersByHash.forEach((value, key) => {
      if (!confirmedDbTxHashes.includes(key)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
      }
    });
  }

  /**
   * Updates transaction statuses which are confirmed on blockchain
   *
   * @param bcHashesString blockhain hashes delimited with comma
   * @param wallet wallet entity
   * @param conn connection
   * @returns array of confirmed transaction hashes
   */
  public async updateConfirmedTransactions(
    bcHashesString: string,
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
        AND transactionHash in (@hashes)`,
      {
        status: TransactionStatus.CONFIRMED,
        hashes: bcHashesString,
        chain: wallet.chain,
        address: wallet.address,
        chainType: wallet.chainType,
      },
      conn,
    );

    const confirmedDbTxHashes = (
      await new Transaction({}, this.context).getTransactionsInHashes(
        wallet.chain,
        wallet.chainType,
        wallet.address,
        TransactionStatus.CONFIRMED,
        bcHashesString,
        conn,
      )
    ).map((tx) => {
      return tx.transactionHash;
    });

    const txDbHashesString = confirmedDbTxHashes.join(',');
    console.log(
      `${confirmedDbTxHashes.length} Transactions matched (txHashes=${txDbHashesString}) in db.`,
    );
    return confirmedDbTxHashes;
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
