import { env, EvmChain } from '@apillon/lib';
import { gql, GraphQLClient } from 'graphql-request';
import { EvmTransfers } from './data-models/evm-transfer';
import { BlockHeight } from '../block-height';

export class EvmBlockchainIndexer {
  private graphQlClient: GraphQLClient;

  private chainGqlMap = new Map<EvmChain, string>([
    [EvmChain.MOONBASE, env.BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER],
    [EvmChain.MOONBEAM, env.BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER],
    [EvmChain.ASTAR, env.BLOCKCHAIN_ASTAR_GRAPHQL_SERVER],
    [EvmChain.ETHEREUM, env.BLOCKCHAIN_ETHEREUM_GRAPHQL_SERVER],
    [EvmChain.SEPOLIA, env.BLOCKCHAIN_SEPOLIA_GRAPHQL_SERVER],
    [EvmChain.ALFAJORES, env.BLOCKCHAIN_CELO_ALFAJORES_GRAPHQL_SERVER],
    [EvmChain.CELO, env.BLOCKCHAIN_CELO_GRAPHQL_SERVER],
    [EvmChain.BASE, env.BLOCKCHAIN_BASE_GRAPHQL_SERVER],
    [EvmChain.BASE_SEPOLIA, env.BLOCKCHAIN_BASE_SEPOLIA_GRAPHQL_SERVER],
    [EvmChain.ARBITRUM_ONE, env.BLOCKCHAIN_ARBITRUM_ONE_GRAPHQL_SERVER],
    [
      EvmChain.ARBITRUM_ONE_SEPOLIA,
      env.BLOCKCHAIN_ARBITRUM_ONE_SEPOLIA_GRAPHQL_SERVER,
    ],
    [EvmChain.AVALANCHE, env.BLOCKCHAIN_AVALANCHE_GRAPHQL_SERVER],
    [EvmChain.AVALANCHE_FUJI, env.BLOCKCHAIN_AVALANCHE_FUJI_GRAPHQL_SERVER],
    [EvmChain.OPTIMISM, env.BLOCKCHAIN_OPTIMISM_GRAPHQL_SERVER],
    [EvmChain.OPTIMISM_SEPOLIA, env.BLOCKCHAIN_OPTIMISM_SEPOLIA_GRAPHQL_SERVER],
    [EvmChain.POLYGON, env.BLOCKCHAIN_POLYGON_GRAPHQL_SERVER],
    [EvmChain.POLYGON_AMOY, env.BLOCKCHAIN_POLYGON_AMOY_GRAPHQL_SERVER],
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
            blockNumber_gt: $fromBlock
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

    return await this.graphQlClient.request(GRAPHQL_QUERY, {
      address: address.toLowerCase(),
      fromBlock,
      toBlock,
    });
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
            blockNumber_gt: $fromBlock
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

    return await this.graphQlClient.request(GRAPHQL_QUERY, {
      address: address.toLowerCase(),
      fromBlock,
      toBlock,
    });
  }

  public async getWalletTransactions(
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
            AND: [
              { OR: [{ to_eq: $address }, { from_eq: $address }] }
              { blockNumber_gt: $fromBlock }
              { blockNumber_lte: $toBlock }
            ]
          }
          orderBy: blockNumber_ASC
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

    return await this.graphQlClient.request(GRAPHQL_QUERY, {
      address: address.toLowerCase(),
      fromBlock,
      toBlock,
    });
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
