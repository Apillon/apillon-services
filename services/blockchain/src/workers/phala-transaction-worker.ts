import {
  ChainType,
  InstantiatedTransactionWebhookDataDto,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { LogOutput } from '@apillon/workers-lib';
import {
  executeWebhooksForTransmittedTransactionsInWallet,
  processInstantiatedTransactionsWebhooks,
} from '../lib/webhook-procedures';
import { Wallet } from '../modules/wallet/wallet.model';
import { SubstrateTransactionWorker } from './substrate-transaction-worker';
import { DbTables, TransactionIndexerStatus } from '../config/types';

/**
 * Phala has its own worker because we need to fetch "Instantiated" events from TX that we didn't emit
 */
export class PhalaTransactionWorker extends SubstrateTransactionWorker {
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
      const toBlock: number = blockHeight;

      console.log(this.indexer.toString());

      //Execute webhooks for instantiated contracts
      try {
        const instantiatedTransactions =
          await this.indexer.getContractsInstantiatedTransactions(
            wallet.address,
            fromBlock,
            toBlock,
          );
        const instantiatedTransactionsDtos = instantiatedTransactions.map(
          (tx) =>
            new InstantiatedTransactionWebhookDataDto().populate({
              deployerAddress: tx.deployer,
              contractAddress: tx.contract,
            }),
        );
        await processInstantiatedTransactionsWebhooks(
          instantiatedTransactionsDtos,
          this.webHookWorker.sqsUrl,
          this.webHookWorker.workerName,
        );
      } catch (error) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error executing instantiated transactions webhooks for wallet ${wallet.address}`,
            service: ServiceName.BLOCKCHAIN,
            err: error,
          },
          LogOutput.SYS_ERROR,
        );
        continue;
      }

      // Get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        fromBlock,
        toBlock,
      );

      const conn = await this.context.mysql.start();
      try {
        await this.setPhalaTransactionsState(
          transactions,
          wallet.address,
          conn,
        );

        // If block height is the same and not updated for the past 5 minutes
        if (
          wallet.lastParsedBlock === toBlock &&
          wallet.minutesSinceLastParsedBlock >= 5
        ) {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              message: `Last parsed block has not been updated in the past ${
                wallet.minutesSinceLastParsedBlock
              } minutes for wallet ${wallet.address} (chain ${
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
  protected async setPhalaTransactionsState(
    transactions: any[],
    walletAddress: string,
    conn: PoolConnection,
  ) {
    if (!transactions?.length) {
      return;
    }

    // SUCCESS transactions
    const successTransactions = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.SUCCESS)
      .map((t: any): string => t.extrinsicHash);
    console.log('Success transactions ', successTransactions);
    // Update SUCCESS CONTRACT transactions
    const contractTransactions =
      await this.indexer.getContractInstantiatingTransactions(
        walletAddress,
        successTransactions,
      );
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
    // Update remaining SUCCESSFUL transactions
    if (successTransactions.length > 0) {
      await this.updateTransactions(
        successTransactions,
        TransactionStatus.CONFIRMED,
        conn,
      );
    }

    // Update FAILED transactions
    const failedTransactions = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.FAIL)
      .map((t: any): string => t.extrinsicHash);
    if (failedTransactions.length > 0) {
      await this.updateTransactions(
        failedTransactions,
        TransactionStatus.FAILED,
        conn,
      );
    }
  }

  protected async updateContractInstantiatedTransaction(
    transactionHash: string,
    contractAddress: string,
    conn: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
       SET transactionStatus = @status,
           data              = @contractAddress
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
}
