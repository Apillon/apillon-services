import {
  BaseSingleThreadWorker,
  WorkerDefinition,
  LogOutput,
} from '@apillon/workers-lib';
import { Wallet } from '../modules/wallet/wallet.model';
import { BaseBlockchainIndexer } from '../modules/blockchain-indexers/substrate/base-blockchain-indexer';
import {
  AppEnvironment,
  ChainType,
  Context,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import {
  DbTables,
  TransactionIndexerStatus,
  WebhookWorker,
} from '../config/types';
import {
  createSubstrateTxWebhookDto,
  processWebhooks,
} from '../lib/webhook-procedures';
import { ParachainConfig } from '../config/substrate-parachain';

export class SubstrateTransactionWorker extends BaseSingleThreadWorker {
  private chainId: string;
  private chainName: string;
  private logPrefix: string;
  private wallets: Wallet[];
  private indexer: BaseBlockchainIndexer;
  private webHookWorker: WebhookWorker;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);

    // Kinda part of the worker definition, the chainId is
    this.chainId = workerDefinition.parameters.chainId;

    this.chainName = SubstrateChain[this.chainId];
    this.logPrefix = `[SUBSTRATE | ${this.chainName}]`;
    this.setParachainParams();
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

      if (
        transactions.length > 0 &&
        env.APP_ENV !== AppEnvironment.TEST &&
        env.APP_ENV !== AppEnvironment.LOCAL_DEV
      ) {
        const webhooks = transactions.map((t) => {
          return createSubstrateTxWebhookDto(t);
        });

        try {
          await processWebhooks(
            webhooks,
            this.webHookWorker.workerName,
            this.webHookWorker.sqsUrl,
            this.context,
          );
        } catch (error) {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              message: 'Error in TransactionWebhookWorker sending webhook',
              service: ServiceName.BLOCKCHAIN,
              data: { transactions },
              err: error,
            },
            LogOutput.SYS_ERROR,
          );
        }
      }
    }
  }

  private setParachainParams() {
    const config = ParachainConfig[this.chainName];

    if (config === undefined) {
      // I don't want to log anything here. This should NEVER happen
      // Another reason is to be able to call this function
      // from the constructor -- no async allowed.
      throw Error('Invalid parachain!');
    }

    // Class in config must be instantiated
    this.indexer = new config.indexer();

    // Set webhook worker - from the service that triggered the transaction
    this.webHookWorker = {
      workerName: config.workerName,
      sqsUrl: config.sqsUrl,
    };
  }

  private async fetchAllResolvedTransactions(
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    // Get all transactions from the
    const transactions = await this.indexer.getAllSystemEvents(
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
        return t.extrinsicHash;
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
