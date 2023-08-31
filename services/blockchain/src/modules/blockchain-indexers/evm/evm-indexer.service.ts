import { EvmChain, env } from '@apillon/lib';
import { GraphQLClient, gql } from 'graphql-request';
import { EvmTransfers } from './data-models/evm-transfer';
import { BlockHeight } from '../block-height';

export class EvmBlockchainIndexer {
  private graphQlClient: GraphQLClient;

  private chainGqlMap = new Map<EvmChain, string>([
    [EvmChain.MOONBASE, env.BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER],
    [EvmChain.MOONBEAM, env.BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER],
    [EvmChain.ASTAR, env.BLOCKCHAIN_ASTAR_GRAPHQL_SERVER],
  ]);

  constructor(chain: EvmChain) {
    const graphqlServerUrl = this.chainGqlMap.get(chain);
    if (!graphqlServerUrl) {
      throw new Error(
        `Missing EVM (chain=${EvmChain[chain]}) GraphQL server url!`,
      );
    }
    this.graphQlClient = new GraphQLClient(graphqlServerUrl);
  }

  public async getWalletOutgoingTxs(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<EvmTransfers> {
    const GRAPHQL_QUERY = gql`
      query getOutgoingTxs(
        $address: String!
        $fromBlock: Int!
        $toBlock: Int!
      ) {
        transactions(
          where: {
            from_eq: $address
            blockNumber_gte: $fromBlock
            blockNumber_lte: $toBlock
          }
        ) {
          id
          transactionHash
          blockNumber
          blockHash
          blockTimestamp
          from
          to
          value
          nonce
          gasUsed
          effectiveGasPrice
          status
          createdAt
        }
      }
    `;

    address = address.toLowerCase();
    const data: EvmTransfers = await this.graphQlClient.request(GRAPHQL_QUERY, {
      address,
      fromBlock,
      toBlock,
    });
    return data;
  }

  public async getWalletIncomingTxs(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<EvmTransfers> {
    const GRAPHQL_QUERY = gql`
      query getIncomingTxs(
        $address: String!
        $fromBlock: Int!
        $toBlock: Int!
      ) {
        transactions(
          where: {
            to_eq: $address
            blockNumber_gte: $fromBlock
            blockNumber_lte: $toBlock
          }
        ) {
          id
          transactionHash
          blockNumber
          blockHash
          blockTimestamp
          from
          to
          value
          nonce
          gasUsed
          effectiveGasPrice
          status
          createdAt
        }
      }
    `;

    address = address.toLowerCase();
    const data: EvmTransfers = await this.graphQlClient.request(GRAPHQL_QUERY, {
      address,
      fromBlock,
      toBlock,
    });
    return data;
  }

  public async getWalletTransactions(
    address: string,
    fromBlock: number,
    limit: number = null,
  ): Promise<EvmTransfers> {
    const GRAPHQL_QUERY = gql`
      query getIncomingTxs($address: String!, $fromBlock: Int!, $limit: Int) {
        transactions(
          where: {
            AND: [
              { OR: [{ to_eq: $address }, { from_eq: $address }] }
              { blockNumber_gt: $fromBlock }
            ]
          }
          orderBy: blockNumber_ASC
          limit: $limit
        ) {
          id
          transactionHash
          blockNumber
          blockHash
          blockTimestamp
          from
          to
          value
          nonce
          gasUsed
          effectiveGasPrice
          status
          createdAt
        }
      }
    `;

    address = address.toLowerCase();
    const data: EvmTransfers = await this.graphQlClient.request(GRAPHQL_QUERY, {
      address,
      fromBlock,
      limit,
    });
    return data;
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
}
