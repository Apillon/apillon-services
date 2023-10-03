import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { PhalaGqlQueries } from './graphql-queries';
import { SystemEvent } from '../kilt/data-models';

export class PhalaBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER);
  }

  public async getAllSystemEvents(
    _account: string,
    _fromBlock: number,
    _toBlock?: number,
    _limit?: number,
  ): Promise<SystemEvent[]> {
    throw Error('Not implemented');
  }

  public async getAllTransactions(
    _account: string,
    _fromBlock: number,
    _toBlock: number,
  ) {
    throw Error('Not implemented');
  }

  public async getAccountTransactionsByHash(
    address: string,
    extrinsicHash: string,
  ): Promise<any> {
    return await this.graphQlClient.request(
      gql`
        ${PhalaGqlQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        address,
        extrinsicHash,
      },
    );
  }
}
