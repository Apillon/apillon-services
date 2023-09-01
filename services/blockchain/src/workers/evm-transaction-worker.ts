import {
  AppEnvironment,
  ChainType,
  Context,
  env,
  EvmChain,
  LogType,
  PoolConnection,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  sendToWorkerQueue,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../modules/wallet/wallet.model';
import { BlockchainErrorCode, DbTables } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import {
  EvmTransfer,
  EvmTransfers,
} from '../modules/blockchain-indexers/evm/data-models/evm-transfer';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
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
    const wallets = await new Wallet({}, this.context).getWallets(
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

        if (
          env.APP_ENV == AppEnvironment.TEST ||
          env.APP_ENV == AppEnvironment.LOCAL_DEV
        ) {
          console.log(
            `${env.APP_ENV} => Skipping webhook trigger ... TODO: Implement for LOCAL`,
          );
        } else {
          await sendToWorkerQueue(
            env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
            WorkerName.TRANSACTION_WEBHOOKS,
            [{}],
            null,
            null,
          );
        }
      } catch (err) {
        await conn.rollback();

        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `${this.logPrefix}: Error confirming transactions`,
            service: ServiceName.BLOCKCHAIN,
            err: err,
            data: {
              error: err,
              wallet: wallets.address,
            },
          },
          LogOutput.NOTIFY_ALERT,
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
      return;
    }

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

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `${this.logPrefix}: Processed ${outgoingTxs.transactions.length} outgoing transactions.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          transactions: outgoingTxs.transactions,
          wallet: wallet.address,
        },
      },
      LogOutput.EVENT_INFO,
    );

    // All transactions were matched with db
    if (outgoingTxs.transactions.length === updatedDbTxs.length) {
      return;
    }

    outgoingTxs.transactions.forEach(async (bcTx) => {
      if (!updatedDbTxs.includes(bcTx.transactionHash)) {
        // UNKNOWN TX!
        await this.writeEventLog(
          {
            logType: LogType.WARN,
            message: `${this.logPrefix} Detecting unknown transaction from ${wallet.address}!`,
            service: ServiceName.BLOCKCHAIN,
            data: {
              wallet: wallet.address,
              tx: bcTx,
            },
          },
          LogOutput.NOTIFY_ALERT,
        );
      }
    });
  }

  public async handleIncomingEvmTxs(wallet: Wallet, incomingTxs: EvmTransfers) {
    if (!incomingTxs.transactions.length) {
      return;
    }

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `${this.logPrefix}: Detected ${incomingTxs.transactions.length} deposits to ${wallet.address}.`,
        service: ServiceName.BLOCKCHAIN,
        data: { wallet: wallet.address },
      },
      LogOutput.NOTIFY_MSG,
    );
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
        .map((tx) => [tx.transactionHash, tx]),
    );

    if (!bcTxsByStatus.size) {
      return;
    }

    const outgoingTxHashes: string[] = [...bcTxsByStatus.keys()];

    const updatedDbTxs: string[] = await this.updateTransactions(
      outgoingTxHashes,
      status,
      wallet,
      conn,
    );

    const txDbHashesString = updatedDbTxs.join(',');

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `${this.logPrefix}: ${updatedDbTxs.length} [${TransactionStatus[status]}] blockchain transactions matched (txHashes=${txDbHashesString}) in db.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          updatedDbTxs,
          wallet: wallet.address,
        },
      },
      LogOutput.EVENT_INFO,
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
