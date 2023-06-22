import { GraphQLClient, gql } from 'graphql-request';
import { BlockHeight } from '../block-height';

export class BaseBlockchainIndexer {
  public graphQlClient: GraphQLClient;
  private blockchainGraphQLServerUrl: string;

  constructor(bcsGQLUrl: string) {
    this.blockchainGraphQLServerUrl = bcsGQLUrl;
    this.graphQlClient = new GraphQLClient(this.blockchainGraphQLServerUrl);
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

  public setGrapQlUrl(url: string) {
    this.blockchainGraphQLServerUrl = url;
  }

  public getGrapQlUrl() {
    return this.blockchainGraphQLServerUrl;
  }

  public toString() {
    return `Indexer listening on: ${this.blockchainGraphQLServerUrl}`;
  }
}
