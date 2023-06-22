import { BaseSingleThreadWorker, WorkerDefinition } from '@apillon/workers-lib';
import { Wallet } from '../../common/models/wallet';
import { BaseBlockchainIndexer } from '../../modules/blockchain-indexers/substrate/base-blockchain-indexer';
import {
  ChainType,
  Context,
  PoolConnection,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { KiltBlockchainIndexer } from '../../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';
import { DbTables } from '../../config/types';
import { Transaction } from '../../common/models/transaction';

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

    console.error('Chain ID', this.chainId);
    console.error('Chain Name', this.chainName);

    // I feel like this is an antipattern and should be done in a better way
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

  private async handleResolvedTransactions(wallets: Wallet[]) {
    const conn = await this.context.mysql.start();

    const blockHeight = await this.indexer.getBlockHeight();
    for (const w of wallets) {
      const wallet = new Wallet(w, this.context);

      const lastParsedBlock: number = wallet.lastParsedBlock;
      const toBlock: number =
        lastParsedBlock + wallet.blockParseSize < blockHeight
          ? lastParsedBlock + wallet.blockParseSize
          : blockHeight;

      this.log(
        `Checking RESOLVED transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
      );

      // Get all transactions from the indexer
      const transactions = await this.fetchAllResolvedTransactions(
        wallet.address,
        lastParsedBlock,
        toBlock,
      );

      // Update the state of all transactions in the BCS DB
      const evalTransactions = await this.updateTransactions(
        wallet,
        transactions,
        conn,
      );

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

    // We are expecting an array of arrays from .values, so flatten
    // to single non-nested array of transaction to evaluate
    // getTransaction should be generic enough to implement
    // in all cases - all parachains
    return transactions.values().flatten(Infinity);
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
