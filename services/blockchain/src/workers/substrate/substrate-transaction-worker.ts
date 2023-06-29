import { BaseSingleThreadWorker, WorkerDefinition } from '@apillon/workers-lib';
import { Wallet } from '../../common/models/wallet';
import { BaseBlockchainIndexer } from '../../modules/blockchain-indexers/substrate/base-blockchain-indexer';
import {
  ChainType,
  Context,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
} from '@apillon/lib';
import { KiltBlockchainIndexer } from '../../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';
import { DbTables } from '../../config/types';
import { Transaction } from '../../common/models/transaction';

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

    console.log('BLOCK HEIGHT', blockHeight);

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
      const evalTransactions = await this.updateTransactions(
        wallet,
        transactions,
        conn,
      );

      console.error('Evaluated transactions: ', evalTransactions);

      // Handle alerts
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

    console.log('TX', transactions);
    console.log('Lenght', Object.keys(transactions).length);

    // We are expecting an array of arrays from .values, so flatten
    // to single non-nested array of transaction to evaluate
    // getTransaction should be generic enough to implement
    // in all cases - all parachains
    // return transactions.objects().length > 0
    //   ? transactions.values().flatten(Infinity)
    //   : [];
    return [];
  }

  private async updateTransactions(
    wallet: Wallet,
    transactions: any[],
    conn: PoolConnection,
  ) {
    const evalTransactions = [];
    for (let i = 0; i < transactions.length; i++) {
      console.log('Transaction ', transactions[i]);
      evalTransactions.push(
        await this.updateTransaction(
          transactions[i].exstrinsicHash,
          wallet,
          conn,
        ),
      );
    }

    return evalTransactions;
  }

  /**
   * Updates transaction statuses which are confirmed on blockchain
   *
   * @param transactionHash hash of transaction
   * @param wallet wallet entity
   * @param conn connection
   * @returns array of confirmed transaction hashes
   */
  public async updateTransaction(
    transactionHash: string,
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
        AND transactionHash = @transactionHash`,
      {
        chain: wallet.chain,
        address: wallet.address,
        chainType: wallet.chainType,
        transactionHash: transactionHash,
      },
      conn,
    );

    // TODO: Why do dis??
    return await new Transaction({}, this.context).getTransactionList(
      wallet.chain,
      wallet.chainType,
      wallet.address,
      conn,
    )[0].transactionHash;
  }
}
