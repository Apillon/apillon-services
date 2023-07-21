import {
  BaseSingleThreadWorker,
  WorkerDefinition,
  sendToWorkerQueue,
  LogOutput,
} from '@apillon/workers-lib';
import { Wallet } from '../common/models/wallet';
import { BaseBlockchainIndexer } from '../modules/blockchain-indexers/substrate/base-blockchain-indexer';
import {
  ChainType,
  Context,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';
import { WorkerName } from './worker-executor';
import { DbTables, TransactionIndexerStatus } from '../config/types';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/crust-indexer.service';

export enum SubstrateChainName {
  KILT = 'KILT',
  CRUST = 'CRUST',
}

export class SubstrateTransactionWorker extends BaseSingleThreadWorker {
  private chainId: string;
  private chainName: string;
  private logPrefix: string;
  private wallets: Wallet[];
  private indexer: BaseBlockchainIndexer;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);

    // Kinda part of the worker definition, the chainId is
    console.log('SUBSTRATEW: workerDefinition ', workerDefinition);
    console.log('SUBSTRATEW: parameters', workerDefinition.parameters);
    this.chainId = workerDefinition.parameters.chainId;

    this.chainName = SubstrateChain[this.chainId];
    this.logPrefix = `[SUBSTRATE | ${this.chainName}]`;
    this.setIndexer();
  }

  public async runExecutor(_data?: any): Promise<any> {
    // Wallets will be populated once the runExecutor method is called
    this.wallets = await new Wallet({}, this.context).getWallets(
      SubstrateChain[this.chainName],
      ChainType.SUBSTRATE,
    );

    const blockHeight = await this.indexer.getBlockHeight();

    for (const w of this.wallets) {
      const wallet = new Wallet(w, this.context);

      // TODO: There was range calculation here, which I am not
      // sure is relevant to be honest. Maybe if there are
      // a shitton transactions at once, this could break. Let's see
      const fromBlock: number = wallet.lastParsedBlock;
      const toBlock: number = blockHeight;

      // Get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        fromBlock,
        toBlock,
      );

      const conn = await this.context.mysql.start();
      try {
        await this.setTransactionsState(transactions, conn);

        await wallet.updateLastParsedBlock(toBlock, conn);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `${this.logPrefix}: Error confirming transactions`,
            service: ServiceName.BLOCKCHAIN,
            data: {
              error: err,
              wallet: wallet.address,
            },
          },
          LogOutput.NOTIFY_ALERT,
        );
        continue;
      }
      if (transactions.length > 0) {
        // Trigger webhook worker
        await sendToWorkerQueue(
          env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
          WorkerName.TRANSACTION_WEBHOOKS,
          [{}],
          null,
          null,
        );
      }
    }
  }

  // NOTE: Sets the Substrate Indexer
  private setIndexer() {
    switch (this.chainName) {
      case SubstrateChainName.KILT:
        this.indexer = new KiltBlockchainIndexer();
        break;
      case SubstrateChainName.CRUST:
        this.indexer = new CrustBlockchainIndexer();
        break;
      default:
        // TODO: Proper error handling
        console.error('Invalid chain');
    }
  }

  private async fetchAllResolvedTransactions(
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    // Get all transactions from the
    const transactions = await this.indexer.getAllTransactions(
      address,
      fromBlock,
      toBlock,
    );

    const transactionsArray: Array<any> = Object.values(transactions);
    return transactionsArray.length > 0 ? transactionsArray.flat(Infinity) : [];
  }

  private async setTransactionsState(
    transactions: any[],
    conn: PoolConnection,
  ) {
    if (!transactions?.length) {
      return;
    }

    const successTransactions: any = transactions
      .filter((t: any) => {
        return t.status == TransactionIndexerStatus.SUCCESS;
      })
      .map((t: any): string => {
        return t.extrinsicHash;
      });

    const failedTransactions: string[] = transactions
      .filter((t: any) => {
        t.status == TransactionIndexerStatus.FAIL;
      })
      .map((t: any): string => {
        return t.transactionHash;
      });

    // Update SUCCESSFUL transactions
    await this.updateTransactions(
      successTransactions,
      TransactionStatus.CONFIRMED,
      conn,
    );

    // Update FAILED transactions
    await this.updateTransactions(
      failedTransactions,
      TransactionStatus.FAILED,
      conn,
    );
  }

  private async updateTransactions(
    transactionHashes: string[],
    status: TransactionStatus,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
      SET transactionStatus = @status
      WHERE
        chain = @chain
        AND transactionHash in ('${transactionHashes.join(`','`)}')`,
      {
        chain: this.chainId,
        status: status,
      },
      conn,
    );

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `${this.logPrefix}: ${transactionHashes.length} [${
          TransactionStatus[status]
        }] blockchain transactions matched (txHashes=${transactionHashes.join(
          `','`,
        )}) in db.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          transactionHashes,
          chain: this.chainId,
        },
      },
      LogOutput.EVENT_INFO,
    );
  }
}
