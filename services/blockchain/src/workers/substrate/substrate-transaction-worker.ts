import {
  BaseSingleThreadWorker,
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  WorkerLogStatus,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { Wallet } from '../../common/models/wallet';
import { BaseBlockchainIndexer } from '../../modules/blockchain-indexers/substrate/base-blockchain-indexer';
import {
  AppEnvironment,
  ChainType,
  Context,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import { KiltBlockchainIndexer } from '../../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';
import { Transaction } from '../../common/models/transaction';
import { WorkerName } from '../worker-executor';
import { TransactionWebhookWorker } from '../transaction-webhook-worker';

function formatMessage(a: string, t: number, f: number): string {
  return `Evaluating RESOLVED transactions: SOURCE ${a}, FROM ${t}, TO ${f}`;
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
    this.chainId = workerDefinition.parameters.chainId;

    this.chainName = SubstrateChain[this.chainId];
    this.logPrefix = `[SUBSTRATE | ${this.chainName}]`;
    this.setIndexer();
  }

  public async runExecutor(_data?: any): Promise<any> {
    // Wallets will be populated once the runExecutor method is called
    this.wallets = await new Wallet({}, this.context).getList(
      SubstrateChain.KILT,
      ChainType.SUBSTRATE,
    );

    // A pending transaction should not be evaluated
    await this.handleResolvedTransactions(this.wallets);
  }

  private log(message: any) {
    console.log(`${this.logPrefix}: ${message}`);
  }

  private async logAms(message: any, wallet?: string, error?: boolean) {
    await new Lmas().writeLog({
      logType: error ? LogType.ERROR : LogType.INFO,
      message: message,
      location: 'SubstrateTransactionWorker',
      service: ServiceName.BLOCKCHAIN,
      data: {
        wallet,
      },
    });
  }

  // NOTE: Sets the Substrate Indexer
  private setIndexer() {
    switch (this.chainName) {
      case 'KILT':
        this.indexer = new KiltBlockchainIndexer();
        break;
      case 'CRUST':
        //this.indexer = new CrustBlockchainIndexer();
        break;
      default:
        // TODO: Proper error handling
        console.error('Invalid chain');
    }

    this.log(this.indexer.toString());
  }

  private async handleResolvedTransactions(wallets: Wallet[]) {
    const conn = await this.context.mysql.start();

    const blockHeight = await this.indexer.getBlockHeight();

    for (const w of wallets) {
      const wallet = new Wallet(w, this.context);

      // TODO: There was range calculation here, which I am not
      // sure is relevant to be honest. Maybe if there are
      // a shitton of transactions, this could break. Let's see
      const fromBlock: number = wallet.lastParsedBlock;
      const toBlock: number = blockHeight;

      const message = this.log(
        formatMessage(wallet.address, fromBlock, toBlock),
      );
      await this.logAms(message);

      // Get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        fromBlock,
        toBlock,
      );

      // Update the state of all transactions in the BCS DB
      await this.updateTransactions(transactions);

      if (transactions.length > 0) {
        if (
          env.APP_ENV == AppEnvironment.LOCAL_DEV ||
          env.APP_ENV == AppEnvironment.TEST
        ) {
          console.log('Starting DEV Webhook worker ...');

          // Directly calls worker -> USED ONLY FOR DEVELOPMENT!!
          const serviceDef: ServiceDefinition = {
            type: ServiceDefinitionType.SQS,
            config: { region: 'test' },
            params: { FunctionName: 'test' },
          };

          const wd = new WorkerDefinition(
            serviceDef,
            WorkerName.TRANSACTION_WEBHOOKS,
            {},
          );

          const worker = new TransactionWebhookWorker(
            wd,
            this.context,
            QueueWorkerType.EXECUTOR,
          );
          await worker.runExecutor({});
        } else {
          // Trigger webhook worker
          await sendToWorkerQueue(
            env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
            WorkerName.TRANSACTION_WEBHOOKS,
            [{}],
            null,
            null,
          );
        }

        await this.writeLogToDb(
          WorkerLogStatus.INFO,
          'Found new transactions. Triggering transaction webhook worker!',
          {
            transactions: transactions,
            wallet: wallet.address,
          },
        );
      }
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

    const trasactionsArray: Array<Transaction> = Object.values(transactions);
    return trasactionsArray.length > 0 ? trasactionsArray.flat(Infinity) : [];
  }

  private async updateTransactions(transactions: any[]) {
    for (let i = 0; i < transactions.length; i++) {
      console.log('Transaction 1111', transactions[i]);

      const transaction = await new Transaction(
        {},
        this.context,
      ).populateByHash(transactions[i].extrinsicHash);

      if (!transaction.exists()) {
        console.error('no tra');
      } else {
        console.log('HEREREEEEE');
        const t = transactions[i];
        t.transactionStatus = 2;
        transaction.populate(t);
        // transactions[i].status == 1
        //   ? TransactionStatus.CONFIRMED
        //   : TransactionStatus.FAILED;
        await transaction.update();
      }
    }
  }
}
