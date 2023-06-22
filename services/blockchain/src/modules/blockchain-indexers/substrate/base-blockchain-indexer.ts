import { GraphQLClient } from 'graphql-request';

export class BaseBlockchainIndexer {
  public graphQlClient: GraphQLClient;
  private blockchainGraphQLServerUrl: string;

  constructor(bcsGQLUrl: string) {
    this.blockchainGraphQLServerUrl = bcsGQLUrl;
    this.graphQlClient = new GraphQLClient(this.blockchainGraphQLServerUrl);
  }
}
