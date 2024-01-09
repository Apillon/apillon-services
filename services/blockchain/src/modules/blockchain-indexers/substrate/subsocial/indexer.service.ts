import { env } from '@apillon/lib';
import { gql } from 'graphql-request';

import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { SystemEvent } from '../data-models';
import { SubsocialGQLQueries } from './graphql-queries';

export class SubsocialBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_SUBSOCIAL_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_SUBSOCIAL_GRAPHQL_SERVER);
  }

  // NOTE: It would be better to transform abstract functions
  // into generics inside base-blockchain-indexer. Similar to model methods
  // such as getList, populateById etc
  public async getAllTransactions(
    account: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const data: any = await this.graphQlClient.request(
      gql`
        ${SubsocialGQLQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
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
      spaces: data.spaces,
      posts: data.posts,
    };
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock?: number,
    limit?: number,
  ): Promise<SystemEvent[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${SubsocialGQLQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
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

  public async getAccountTransactionsByHash(
    address: string,
    extrinsicHash: string,
  ): Promise<any> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${SubsocialGQLQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        address,
        extrinsicHash,
      },
    );

    return data;
  }

  public async getAccountTransfers(
    address: string,
    extrinsicHash: string,
  ): Promise<any> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${SubsocialGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        address,
        extrinsicHash,
      },
    );

    return data;
  }
}
