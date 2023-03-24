import {
  AppEnvironment,
  ChainType,
  Context,
  env,
  PoolConnection,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { Job, ServerlessWorker, WorkerDefinition } from '@apillon/workers-lib';
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

export class CrustTransactionWorker extends ServerlessWorker {
  private context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
  }

  public async before(data?: any): Promise<any> {
    // No used
  }

  public async execute(data?: any): Promise<any> {
    const wallets = await new Wallet({}, this.context).getList(
      SubstrateChain.CRUST,
      ChainType.SUBSTRATE,
    );

    const maxBlocks = 50;
    for (const wallet of wallets) {
      const conn = await this.context.mysql.start();
      console.log(
        `Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock})..`,
      );
      try {
        const lastParsedBlock: number = wallet.lastParsedBlock;
        const crustTransactions = await this.fetchAllCrustTransactions(
          wallet.address,
          lastParsedBlock,
          lastParsedBlock + maxBlocks,
        );

        let currentParsedBlock = await this.handleBlockchainTransfers(
          lastParsedBlock,
          wallet,
          crustTransactions.withdrawals,
          crustTransactions.deposits,
          conn,
        );

        currentParsedBlock = await this.handleCrustFileOrders(
          lastParsedBlock,
          currentParsedBlock,
          wallet,
          crustTransactions.fileOrders,
          conn,
        );
        wallet.blockNum = currentParsedBlock;
        await wallet.update();
        await conn.commit();
        console.log(
          `Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${currentParsedBlock}) FINISHED!`,
        );
      } catch (err) {
        await conn.rollback();
        console.log(
          `Checking PENDING transactions (sourceWallet=${wallet.address}) FAILED! Error: ${err}`,
        );
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

  /**
   * Handling blockchain withdrawals/deposits
   *
   * @param sourceWallet wallet from/to transaction happened
   * @param pendingDbTxs pending transactions in db
   */
  public async handleBlockchainTransfers(
    fromBlock: number,
    wallet: Wallet,
    withdrawals: CrustTransfers,
    deposits: CrustTransfers,
    conn: PoolConnection,
  ): Promise<number> {
    let latestParsedBlock = await this.handleCrustWithdrawals(
      fromBlock,
      withdrawals,
      wallet,
      conn,
    );
    latestParsedBlock = await this.handleCrustDeposits(
      fromBlock,
      latestParsedBlock,
      deposits,
      wallet,
    );

    return latestParsedBlock;
  }

  public async handleCrustWithdrawals(
    lastParsedBlock: number,
    withdrawals: CrustTransfers,
    wallet: Wallet,
    conn: PoolConnection,
  ): Promise<number> {
    if (!withdrawals.transfers.length) {
      console.log(
        `There are no new withdrawals received from blockchain indexer (address=${wallet.address}).`,
      );
      return lastParsedBlock;
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

    let maxBlock = 0;
    withdrawalsByHash.forEach((value, key) => {
      if (!confirmedDbTxHashes.includes(key)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
        withdrawalsByHash.delete(key);
      } else {
        if (value.blockNumber > maxBlock) {
          maxBlock = value.blockNumber;
        }
      }
    });

    return maxBlock;
  }

  public async handleCrustDeposits(
    lastParsedBlock: number,
    currentParsedBlock: number,
    deposits: CrustTransfers,
    wallet: Wallet,
    conn?: PoolConnection,
  ) {
    if (!deposits.transfers.length) {
      console.log(
        `There are no new deposits to wallet (address=${wallet.address}).`,
      );
      return lastParsedBlock;
    }
    console.log(
      `Received ${deposits.transfers.length} deposits from blockchain indexer.`,
    );
    let maxBlockNr = 0;
    deposits.transfers.forEach((bcTx) => {
      // TODO: Send notification of a new deposit to a wallet address and save to accounting table
      if (bcTx.blockNumber > maxBlockNr) {
        maxBlockNr = bcTx.blockNumber;
      }
    });
    // Check if latest processed block (withdrawals) is bigger than maxBlock from deposits
    if (currentParsedBlock > maxBlockNr) {
      maxBlockNr = currentParsedBlock;
    }
    return maxBlockNr;
  }

  public async handleCrustFileOrders(
    lastParsedBlock: number,
    currentParsedBlock: number,
    wallet: Wallet,
    bcFileOrders: CrustStorageOrders,
    conn: PoolConnection,
  ): Promise<number> {
    if (!bcFileOrders.storageOrders.length) {
      return lastParsedBlock;
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

    let maxBlockNr = 0;
    bcFileOrdersByHash.forEach((value, key) => {
      if (!confirmedDbTxHashes.includes(key)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
        bcFileOrdersByHash.delete(key);
      } else {
        if (value.blockNum > maxBlockNr) {
          maxBlockNr = value.blockNum;
        }
      }
    });

    // Check if latest processed block (withdrawals) is bigger than maxBlock from deposits
    if (currentParsedBlock > maxBlockNr) {
      maxBlockNr = currentParsedBlock;
    }
    return maxBlockNr;
  }

  /**
   * Updates transactions which are confirmed on blockchain based on blockchain indexer
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
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const crustIndexer = new CrustBlockchainIndexer();

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
