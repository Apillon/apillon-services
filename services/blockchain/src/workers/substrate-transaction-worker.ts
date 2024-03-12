import {
  ChainType,
  Context,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ParachainConfig } from '../config/substrate-parachain';
import {
  DbTables,
  TransactionIndexerStatus,
  WebhookWorker,
} from '../config/types';
import { executeWebhooksForTransmittedTransactionsInWallet } from '../lib/webhook-procedures';
import { BaseBlockchainIndexer } from '../modules/blockchain-indexers/substrate/base-blockchain-indexer';
import { Wallet } from '../modules/wallet/wallet.model';

export class SubstrateTransactionWorker extends BaseSingleThreadWorker {
  protected chainId: string;
  protected chainName: string;
  protected wallets: Wallet[];
  protected indexer: BaseBlockchainIndexer;
  protected webHookWorker: WebhookWorker;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);

    // Kinda part of the worker definition, the chainId is
    this.chainId = workerDefinition.parameters.chainId;

    this.chainName = SubstrateChain[this.chainId];
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

      const fromBlock: number = wallet.lastParsedBlock;
      const toBlock =
        wallet.lastParsedBlock + wallet.blockParseSize < blockHeight
          ? wallet.lastParsedBlock + wallet.blockParseSize
          : blockHeight;

      console.log(
        `${this.indexer.toString()} fetching transactions from block number ${fromBlock} to ${toBlock} for wallet ${
          wallet.address
        }`,
      );

      // Get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        fromBlock,
        toBlock,
      );

      const conn = await this.context.mysql.start();
      try {
        if (transactions?.length) {
          await this.setTransactionsState(transactions, wallet.address, conn);
        }

        const minutes = Math.round(wallet.minutesSinceLastParsedBlock);
        // If block height is the same and not updated for the past 15 minutes
        if (
          wallet.lastParsedBlock === toBlock &&
          !!minutes &&
          minutes % 15 == 0
        ) {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              message: `Last parsed block has not been updated in the past ${Math.round(
                wallet.minutesSinceLastParsedBlock,
              )} minutes for wallet ${wallet.address} (chain ${
                SubstrateChain[wallet.chain]
              })`,
              service: ServiceName.BLOCKCHAIN,
              data: { wallet: wallet.address },
            },
            LogOutput.NOTIFY_ALERT,
          );
        }
        await wallet.updateLastParsedBlock(toBlock, conn);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error confirming transactions for wallet ${w.address}`,
            service: ServiceName.BLOCKCHAIN,
            err,
            data: {
              error: err,
              wallet: wallet.address,
            },
          },
          LogOutput.NOTIFY_ALERT,
        );
        continue;
      }

      //Execute webhooks
      try {
        await executeWebhooksForTransmittedTransactionsInWallet(
          this.context,
          wallet.address,
          this.webHookWorker.workerName,
          this.webHookWorker.sqsUrl,
        );
      } catch (error) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error executing webhooks for wallet ${wallet.address}`,
            service: ServiceName.BLOCKCHAIN,
            err: error,
          },
          LogOutput.SYS_ERROR,
        );
      }
    }
  }

  private setParachainParams() {
    const config = ParachainConfig[this.chainName];

    if (config === undefined) {
      // I don't want to log anything here. This should NEVER happen
      // Another reason is to be able to call this function
      // from the constructor -- no async allowed.
      throw Error(`Invalid parachain: ${this.chainName}!`);
    }

    // Class in config must be instantiated
    this.indexer = new config.indexer();

    // Set webhook worker - from the service that triggered the transaction
    this.webHookWorker = {
      workerName: config.webhookWorkerName,
      sqsUrl: config.sqsUrl,
    };
  }

  protected async fetchAllResolvedTransactions(
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    // Get all transactions from the
    // TODO: Apply range calculation
    const transactions = await this.indexer.getAllSystemEvents(
      address,
      fromBlock,
      toBlock,
    );
    console.log(`Fetched ${transactions.length} transactions.`);
    const transactionsArray: Array<any> = Object.values(transactions);
    return transactionsArray.length > 0 ? transactionsArray.flat(Infinity) : [];
  }

  protected async updateTransactions(
    transactionHashes: string[],
    status: TransactionStatus,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
       SET transactionStatus = @status
       WHERE chain = @chain
         AND transactionHash in ('${transactionHashes.join(`','`)}')`,
      {
        chain: this.chainId,
        status,
      },
      conn,
    );

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `${transactionHashes.length} [${
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

  protected async setTransactionsState(
    transactions: any[],
    _walletAddress: string,
    conn: PoolConnection,
  ) {
    // Update SUCCESSFUL transactions
    const successTransactions: any = transactions
      .filter(
        (t: any) => t.status == TransactionIndexerStatus.SUCCESS && !t.error,
      )
      .map((t: any): string => t.extrinsicHash);
    if (successTransactions.length) {
      await this.updateTransactions(
        successTransactions,
        TransactionStatus.CONFIRMED,
        conn,
      );
    }

    // Update FAILED transactions
    const failedTransactions: string[] = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.FAIL || t.error)
      .map((t: any): string => t.extrinsicHash);

    if (failedTransactions.length) {
      await this.updateTransactions(
        failedTransactions,
        TransactionStatus.FAILED,
        conn,
      );

      //Send admin alert for failed transaction
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: `${failedTransactions.length} transaction(s) have failed on chain for wallet ${_walletAddress}`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            transactions: failedTransactions,
            chain: this.chainId,
            walletAddress: _walletAddress,
          },
        },
        LogOutput.NOTIFY_MSG,
      );
    }
  }
}
