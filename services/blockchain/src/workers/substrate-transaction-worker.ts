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
import { PhalaBlockchainIndexer } from '../modules/blockchain-indexers/substrate/phala/indexer.service';
import { PhatContractsInstantiatingTransaction } from '../modules/blockchain-indexers/substrate/phala/data-models';

export class SubstrateTransactionWorker extends BaseSingleThreadWorker {
  private chainId: string;
  private chainName: string;
  private wallets: Wallet[];
  private indexer: BaseBlockchainIndexer;
  private webHookWorker: WebhookWorker;

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

      // TODO: There was range calculation here, which I am not
      // sure is relevant to be honest. Maybe if there are
      // a shitton transactions at once, this could break. Let's see
      const fromBlock: number = wallet.lastParsedBlock;
      const toBlock: number = blockHeight;

      console.log(this.indexer.toString());

      // Get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        fromBlock,
        toBlock,
      );
      let successTransactions: string[] = [];
      let contractTransactions: PhatContractsInstantiatingTransaction[] = [];
      let failedTransactions: string[] = [];
      let processTransactions = false;
      if (transactions?.length) {
        processTransactions = true;
        // SUCCESS transactions
        successTransactions = transactions
          .filter((t: any) => t.status == TransactionIndexerStatus.SUCCESS)
          .map((t: any): string => t.extrinsicHash);
        console.log('Success transactions ', successTransactions);
        // SUCCESS CONTRACT transactions
        if (this.indexer instanceof PhalaBlockchainIndexer) {
          contractTransactions =
            await this.indexer.getContractInstantiatingTransactions(
              wallet.address,
              successTransactions,
            );
        }
        // FAILED transactions
        failedTransactions = transactions
          .filter((t: any) => t.status == TransactionIndexerStatus.FAIL)
          .map((t: any): string => t.extrinsicHash);
      }

      const conn = await this.context.mysql.start();
      try {
        if (processTransactions) {
          await this.setTransactionsState(
            successTransactions,
            contractTransactions,
            failedTransactions,
            conn,
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

  private async fetchAllResolvedTransactions(
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

    const transactionsArray: Array<any> = Object.values(transactions);
    return transactionsArray.length > 0 ? transactionsArray.flat(Infinity) : [];
  }

  private async setTransactionsState(
    successTransactions: string[],
    contractTransactions: PhatContractsInstantiatingTransaction[],
    failedTransactions: string[],
    conn: PoolConnection,
  ) {
    // Update SUCCESSFUL CONTRACT transactions
    for (const contractTransaction of contractTransactions) {
      await this.updateContractInstantiatedTransaction(
        contractTransaction.extrinsicHash,
        contractTransaction.contract,
        conn,
      );
      delete successTransactions[
        successTransactions.indexOf(contractTransaction.extrinsicHash)
      ];
    }

    // Update OTHER SUCCESSFUL transactions
    if (successTransactions.length > 0) {
      await this.updateTransactions(
        successTransactions,
        TransactionStatus.CONFIRMED,
        conn,
      );
    }

    // Update FAILED transactions
    await this.updateTransactions(
      failedTransactions,
      TransactionStatus.FAILED,
      conn,
    );
  }

  private async updateContractInstantiatedTransaction(
    transactionHash: string,
    contractAddress: string,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
       SET transactionStatus = @status,
           data = @contractAddress
       WHERE chain = @chain
         AND transactionHash = @transactionHash`,
      {
        chain: this.chainId,
        transactionHash,
        status: TransactionStatus.CONFIRMED,
        contractAddress,
      },
      conn,
    );

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message:
          `CONFIRMED blockchain transactions matched (txHash=${transactionHash})` +
          ` in db and got contract id ${contractAddress} assigned.`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          chain: this.chainId,
          transactionHash,
          contractAddress,
        },
      },
      LogOutput.EVENT_INFO,
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
}
