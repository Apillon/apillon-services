import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { UniqueGqlQueries } from './graphql-queries';
import { SystemEvent, TransferTransaction } from '../data-models';
import { CollectionCreated } from './data-models';

export class UniqueBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_UNIQUE_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_UNIQUE_GRAPHQL_SERVER);
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<SystemEvent[]> {
    const data = await this.graphQlClient.request<{ systems: SystemEvent[] }>(
      gql`
        ${UniqueGqlQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
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
      collectionCreateds: CollectionCreated[];
    }>(
      gql`
        ${UniqueGqlQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
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
      collectionCreateds: data.collectionCreateds,
    };
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
        ${UniqueGqlQueries.ACCOUNT_TRANSFERS_BY_BLOCKS}
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
        ${UniqueGqlQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        account,
        extrinsicHash,
      },
    );
  }

  public async getCollectionCreatedTransactions(
    from: string,
    hashes: string[],
  ) {
    const data = await this.graphQlClient.request<{
      collectionCreateds: CollectionCreated[];
    }>(
      gql`
        ${UniqueGqlQueries.COLLECTION_CREATED_BY_HASH_QUERY}
      `,
      {
        from,
        hashes,
      },
    );

    return data.collectionCreateds;
  }
}
