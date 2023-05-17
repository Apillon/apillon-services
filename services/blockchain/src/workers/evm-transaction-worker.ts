import {
  BaseSingleThreadWorker,
  sendToWorkerQueue,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { Wallet } from '../common/models/wallet';
import {
  ChainType,
  Context,
  env,
  EvmChain,
  Lmas,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { EvmTransfers } from '../modules/blockchain-indexers/evm/data-models/evm-transfer';
import { Transaction } from '../common/models/transaction';
import { BlockchainErrorCode, DbTables } from '../config/types';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import { EvmTransfer } from '../modules/blockchain-indexers/evm/data-models/evm-transfer';
import { BlockchainCodeException } from '../lib/exceptions';
import { WorkerName } from './worker-executor';

export class EvmTransactionWorker extends BaseSingleThreadWorker {
  private logPrefix: string;
  private evmChain: EvmChain;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(data: any): Promise<any> {
    this.evmChain = data?.chain;
    if (!this.evmChain) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    this.logPrefix = `[EVM][${EvmChain[data.chain]}]`;

    console.info(
      `${this.logPrefix} RUN EXECUTOR (EvmTransactionWorker). data: `,
      data,
    );
    const wallets = await new Wallet({}, this.context).getList(
      this.evmChain,
      ChainType.EVM,
    );

    for (const w of wallets) {
      const conn = await this.context.mysql.start();
      try {
        const wallet: Wallet = new Wallet(w, this.context);

        const evmIndexer: EvmBlockchainIndexer = new EvmBlockchainIndexer(
          this.evmChain,
        );
        const blockHeight = await evmIndexer.getBlockHeight();

        const lastParsedBlock: number = wallet.lastParsedBlock;
        const toBlock: number =
          lastParsedBlock + wallet.blockParseSize < blockHeight
            ? lastParsedBlock + wallet.blockParseSize
            : blockHeight;

        console.log(
          `${this.logPrefix} Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
        );

        // await this.writeLogToDb(
        //   WorkerLogStatus.INFO,
        //   'Checking pending transactions..',
        //   {
        //     wallet: wallet.address,
        //     fromBlock: lastParsedBlock,
        //     toBlock,
        //   },
        // );

        const walletTxs = await this.fetchAllEvmTransactions(
          evmIndexer,
          wallet.address,
          lastParsedBlock,
          toBlock,
        );

        await this.handleOutgoingEvmTxs(wallet, walletTxs.outgoingTxs, conn);
        await this.handleIncomingEvmTxs(wallet, walletTxs.incomingTxs);

        await wallet.updateLastParsedBlock(toBlock, conn);
        await conn.commit();

        // console.log(
        //   `${this.logPrefix} Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${toBlock}) FINISHED!`,
        // );

        if (
          walletTxs.incomingTxs.transactions.length > 0 ||
          walletTxs.outgoingTxs.transactions.length > 0
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
              incoming: walletTxs.incomingTxs.transactions,
              outgoing: walletTxs.outgoingTxs.transactions,
            },
          );
        }
      } catch (err) {
        await conn.rollback();
        console.error(
          `${this.logPrefix} Checking PENDING transactions (sourceWallet=${w.address}) FAILED! Error: ${err}`,
        );
        await this.writeLogToDb(
          WorkerLogStatus.ERROR,
          'Checking PENDING transactions FAILED!',
          { wallet: wallets.address },
          err,
        );
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Error confirming transactions',
          location: 'EvmTransactionWorker',
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

  public async fetchAllEvmTransactions(
    evmIndexer: EvmBlockchainIndexer,
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const outgoingTxs = await evmIndexer.getWalletOutgoingTxs(
      address,
      fromBlock,
      toBlock,
    );
    const incomingTxs = await evmIndexer.getWalletIncomingTxs(
      address,
      fromBlock,
      toBlock,
    );
    return { outgoingTxs, incomingTxs };
  }

  public async handleOutgoingEvmTxs(
    wallet: Wallet,
    outgoingTxs: EvmTransfers,
    conn: PoolConnection,
  ) {
    if (!outgoingTxs.transactions.length) {
      console.log(
        `${this.logPrefix} There are no new outgoing transactions received from blockchain indexer (address=${wallet.address}).`,
      );
      return;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Matching ${outgoingTxs.transactions.length} outgoing blockchain transactions with transactions in DB.`,
      {
        transactions: outgoingTxs.transactions,
      },
    );

    const confirmedTxs: string[] = await this.updateEvmTransactionsByStatus(
      outgoingTxs,
      TransactionStatus.CONFIRMED,
      wallet,
      conn,
    );
    const failedTxs: string[] = await this.updateEvmTransactionsByStatus(
      outgoingTxs,
      TransactionStatus.FAILED,
      wallet,
      conn,
    );

    const updatedDbTxs: string[] = confirmedTxs.concat(failedTxs);
    // All transactions were matched with db
    if (outgoingTxs.transactions.length === updatedDbTxs.length) {
      return;
    }

    outgoingTxs.transactions.forEach((bcTx) => {
      if (!updatedDbTxs.includes(bcTx.hash)) {
        // TODO: Send notification - critical: Withdrawal (txHash) was not initiated by us
        // use info from value variable to get all required data
      }
    });
  }

  public async handleIncomingEvmTxs(wallet: Wallet, incomingTxs: EvmTransfers) {
    if (!incomingTxs.transactions.length) {
      console.log(
        `${this.logPrefix} There are no new deposits to wallet (address=${wallet.address}).`,
      );
      return;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Matching ${incomingTxs.transactions.length} outgoing blockchain transactions with transactions in DB.`,
      {
        transactions: incomingTxs.transactions,
      },
    );

    incomingTxs.transactions.forEach((bcTx) => {
      // TODO: Send notification of a new deposit to a wallet address and save to accounting table
    });
  }

  public async updateEvmTransactionsByStatus(
    bcTxs: EvmTransfers,
    status: TransactionStatus,
    wallet: Wallet,
    conn: PoolConnection,
  ): Promise<string[]> {
    const bcStatus: BlockchainStatus =
      status == TransactionStatus.CONFIRMED
        ? BlockchainStatus.CONFIRMED
        : BlockchainStatus.FAILED;

    const bcTxsByStatus = new Map<string, EvmTransfer>(
      bcTxs.transactions
        .filter((tx) => {
          return tx.status == bcStatus;
        })
        .map((tx) => [tx.hash, tx]),
    );
    const outgoingTxHashes: string[] = [...bcTxsByStatus.keys()];
    const updatedDbTxs: string[] = await this.updateTransactions(
      outgoingTxHashes,
      status,
      wallet,
      conn,
    );

    const txDbHashesString = updatedDbTxs.join(',');
    console.log(
      `${this.logPrefix} ${updatedDbTxs.length} [${TransactionStatus[status]}] blockchain transactions matched (txHashes=${txDbHashesString}) in db.`,
    );
    return updatedDbTxs;
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
}
