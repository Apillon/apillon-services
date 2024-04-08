import { PhalaBlockchainIndexer } from '../modules/blockchain-indexers/substrate/phala/indexer.service';
import { SubstrateContractTransactionWorker } from './substrate-contract-transaction-worker';

/**
 * Phala has its own worker because beside normal transactions (transmitted by
 * our wallet) we also need to fetch "Instantiated" events to retrieve contract
 * address from TX that we didn't emit (these transactions are emitted by Phala
 * workers on successful instantiation)
 */
export class PhalaTransactionWorker extends SubstrateContractTransactionWorker {
  protected indexer: PhalaBlockchainIndexer;

  protected async fetchAllResolvedTransactions(
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const transactions = await this.indexer.getAllSystemEvents(
      address,
      fromBlock,
      toBlock,
    );
    const clusterTransactions = await this.indexer.getClusterDepositEvents(
      address,
      fromBlock,
      toBlock,
    );
    console.log(
      `Fetched ${transactions.length} transactions and ${clusterTransactions.length} cluster deposits.`,
    );

    const transactionsArray: Array<any> = [
      ...Object.values(clusterTransactions),
      ...Object.values(transactions),
    ];
    return transactionsArray.length > 0 ? transactionsArray.flat(Infinity) : [];
  }
}
