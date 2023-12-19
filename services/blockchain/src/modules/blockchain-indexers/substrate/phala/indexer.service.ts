import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { PhalaGqlQueries } from './graphql-queries';
import { SystemEvent, TransferTransaction } from '../data-models';
import {
  PhatContractsInstantiatedTransaction,
  PhatContractsInstantiatingTransaction,
} from './data-models';

export class PhalaBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER);
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock?: number,
    limit?: number,
  ): Promise<SystemEvent[]> {
    const data = await this.graphQlClient.request<{ systems: SystemEvent[] }>(
      gql`
        ${PhalaGqlQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        limit,
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
      phatContractsInstantiatings: PhatContractsInstantiatingTransaction[];
      phatContractsInstantiateds: PhatContractsInstantiatedTransaction[];
    }>(
      gql`
        ${PhalaGqlQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
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
      phatContractsInstantiatings: data.phatContractsInstantiatings,
      phatContractsInstantiateds: data.phatContractsInstantiateds,
    };
  }

  public async getAccountBalanceTransfersForTxs(
    account: string,
    hashes: string[],
  ): Promise<{
    transfers: TransferTransaction[];
  }> {
    return await this.graphQlClient.request(
      gql`
        ${PhalaGqlQueries.ACCOUNT_TRANSFERS_BY_TX_HASHES_QUERY}
      `,
      {
        account,
        hashes,
      },
    );
  }

  public async getAccountTransactionsByHash(
    account: string,
    extrinsicHash: string,
  ): Promise<any> {
    return await this.graphQlClient.request(
      gql`
        ${PhalaGqlQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        account,
        extrinsicHash,
      },
    );
  }
}
