import { GraphQLClient, gql } from 'graphql-request';
import { BlockHeight } from '../block-height';

export abstract class BaseBlockchainIndexer {
  protected graphQlClient: GraphQLClient;
  private blockchainGraphQLServerUrl: string;

  constructor(bcsGQLUrl: string) {
    this.blockchainGraphQLServerUrl = bcsGQLUrl;
    this.graphQlClient = new GraphQLClient(this.blockchainGraphQLServerUrl);
  }

  public abstract getAllTransactions(...args: any[]): Promise<any>;
  public abstract getAllSystemEvents(...args: any[]): Promise<any>;

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