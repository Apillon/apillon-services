import { gql, GraphQLClient } from 'graphql-request';
import { BlockHeight } from '../block-height';
import {
  PhatContractsInstantiatedTransaction,
  PhatContractsInstantiatingTransaction,
} from './phala/data-models';

export abstract class BaseBlockchainIndexer {
  protected graphQlClient: GraphQLClient;
  private blockchainGraphQLServerUrl: string;

  constructor(bcsGQLUrl: string) {
    this.blockchainGraphQLServerUrl = bcsGQLUrl;
    this.graphQlClient = new GraphQLClient(this.blockchainGraphQLServerUrl);
  }

  public abstract getAllTransactions(...args: any[]): Promise<any>;
  public abstract getAllSystemEvents(...args: any[]): Promise<any>;

  public abstract getAccountTransactionsByHash(...args: any[]): Promise<any>;

  public async getContractInstantiatingTransactions(
    _account: string,
    _hashes: string[],
  ): Promise<PhatContractsInstantiatingTransaction[]> {
    throw new Error('getContractInstantiatingTransactions not implemented');
  }

  public async getContractsInstantiatedEvents(
    _deployer: string,
    _fromBlock: number,
    _toBlock: number,
  ): Promise<PhatContractsInstantiatedTransaction[]> {
    throw new Error('getContractsInstantiatedEvents not implemented');
  }

  public async getBlockHeight(): Promise<number> {
    const GRAPHQL_QUERY = gql`
      query getBlockHeight {
        squidStatus {
          height
        }
      }
    `;

    const data: BlockHeight = await this.graphQlClient.request(GRAPHQL_QUERY);
    return data.squidStatus.height;
  }

  public setGraphQlUrl(url: string) {
    this.blockchainGraphQLServerUrl = url;
  }

  public getGraphQlUrl() {
    return this.blockchainGraphQLServerUrl;
  }

  public toString() {
    return `Indexer running on: ${this.blockchainGraphQLServerUrl}`;
  }
}
