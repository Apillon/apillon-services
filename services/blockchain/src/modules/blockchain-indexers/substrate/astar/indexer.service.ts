import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { AstarGqlQueries } from './graphql-queries';
import { SystemEvent, TransferTransaction } from '../data-models';
import { ContractTransaction } from './data-models';

export class AstarSubstrateBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_ASTAR_SUBSTRATE_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_ASTAR_SUBSTRATE_GRAPHQL_SERVER);
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<SystemEvent[]> {
    const data = await this.graphQlClient.request<{ systems: SystemEvent[] }>(
      gql`
        ${AstarGqlQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );

    return data.systems;
  }

  /**
   * Method is not used in code, only used in tests
   * @param account
   * @param fromBlock
   * @param toBlock
   */
  public async getAllTransactions(
    account: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const data = await this.graphQlClient.request<{
      systems: SystemEvent;
      transfers: TransferTransaction[];
      contracts: ContractTransaction[];
    }>(
      gql`
        ${AstarGqlQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );

    return {
      transfers: data.transfers,
      systems: data.systems,
      contracts: data.contracts,
    };
  }

  public async getContractTransactions(account: string, hashes: string[]) {
    const data = await this.graphQlClient.request<{
      contracts: ContractTransaction[];
    }>(
      gql`
        ${AstarGqlQueries.INSTANTIATING_CONTRACTS_BY_HASH_QUERY}
      `,
      {
        account,
        hashes,
      },
    );

    return data.contracts;
  }

  public async getAccountBalanceTransfersForTxs(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<{
    transfers: TransferTransaction[];
  }> {
    return await this.graphQlClient.request(
      gql`
        ${AstarGqlQueries.ACCOUNT_TRANSFERS_BY_BLOCKS}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );
  }

  public async getAccountTransactionsByHash(
    account: string,
    extrinsicHash: string,
  ): Promise<any> {
    return await this.graphQlClient.request(
      gql`
        ${AstarGqlQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        account,
        extrinsicHash,
      },
    );
  }
}
