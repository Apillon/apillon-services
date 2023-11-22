import {
  ChainType,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  TransactionWebhookDataDto,
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
 * Phala has its own worker because beside normal transactions (transmitted by our wallet) we also need to fetch
 * "Instantiated" events from TX that we didn't emit (these transactions are emitted by Phala workers on successful
 * instantiation)
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

      // INSTANTIATED CONTRACT TRANSACTION INDEXING (for contracts that were instantiated by Phala workers)
      let instantiatedTransactionsDtos: TransactionWebhookDataDto[];
      try {
        // get instantiated contract transactions
        const instantiatedTransactions =
          await this.indexer.getContractsInstantiatedTransactions(
            wallet.address,
            fromBlock,
            toBlock,
          );
        // convert transactions to DTO
        instantiatedTransactionsDtos = instantiatedTransactions.map((tx) =>
          new TransactionWebhookDataDto().populate({
            data: tx.contract,
          }),
        );
      } catch (error) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error fetching instantiated transactions for wallet ${wallet.address}`,
            service: ServiceName.BLOCKCHAIN,
            err: error,
          },
          LogOutput.SYS_ERROR,
        );
        //try to process next wallet if we fail
        continue;
      }

      // OTHER TRANSACTION INDEXING (transmitted to chain by our wallets)
      // get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        fromBlock,
        toBlock,
      );

      const conn = await this.context.mysql.start();
      try {
        // update transactions in DB
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
            message: `Error indexing transactions for wallet ${w.address}`,
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

      try {
        // execute webhooks for OTHER TRANSACTIONS
        await executeWebhooksForTransmittedTransactionsInWallet(
          this.context,
          wallet.address,
          this.webHookWorker.workerName,
          this.webHookWorker.sqsUrl,
        );

        // execute webhooks for INSTANTIATED CONTRACT TRANSACTIONS
        await processInstantiatedTransactionsWebhooks(
          instantiatedTransactionsDtos,
          this.webHookWorker.sqsUrl,
          this.webHookWorker.workerName,
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

    // get all SUCCESS transactions
    const successTransactions = transactions
      .filter((t: any) => t.status == TransactionIndexerStatus.SUCCESS)
      .map((t: any): string => t.extrinsicHash);
    console.log('Success transactions ', successTransactions);

    // SUCCESS CONTRACT transactions
    const contractTransactions =
      await this.indexer.getContractInstantiatingTransactions(
        walletAddress,
        successTransactions,
      );
    for (const contractTransaction of contractTransactions) {
      //update status of transaction and contract address
      await this.updateContractInstantiatedTransaction(
        contractTransaction.extrinsicHash,
        contractTransaction.contract,
        conn,
      );
      // remove transaction so we don't update it again bellow
      delete successTransactions[
        successTransactions.indexOf(contractTransaction.extrinsicHash)
      ];
    }
    // Update OTHER SUCCESSFUL transactions (excluding contract deploys)
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
