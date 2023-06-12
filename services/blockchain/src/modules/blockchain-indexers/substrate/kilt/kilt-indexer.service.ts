import { env } from '@apillon/lib';
import { GraphQLClient, gql } from 'graphql-request';
import { BlockHeight } from '../../block-height';
import { KiltTransfers } from './data-models/kilt-transfers';
import { KiltTransferType } from '../../../../config/types';

export class KiltBlockchainIndexer {
  private graphQlClient: GraphQLClient;

  constructor() {
    if (!env.BLOCKCHAIN_KILT_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }
    this.graphQlClient = new GraphQLClient(env.BLOCKCHAIN_KILT_GRAPHQL_SERVER);
  }

  public async getWalletWithdrawals(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransfers> {
    const GRAPHQL_QUERY = gql`
      query getWithdrawals(
        $address: String!
        $fromBlock: Int!
        $toBlock: Int!
        $transactionType: Int!
      ) {
        transfers(
          where: {
            transactionType_eq: $transactionType
            from: { id_eq: $address }
            blockNumber_gt: $fromBlock
            blockNumber_lte: $toBlock
          }
        ) {
          amount
          blockNumber
          extrinsicHash
          fee
          id
          timestamp
          transactionType
          status
          from {
            id
          }
          to {
            id
          }
        }
      }
    `;

    const data: KiltTransfers = await this.graphQlClient.request(
      GRAPHQL_QUERY,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransferType.TRANSFER,
      },
    );
    return data;
  }

  public async getWalletDeposits(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransfers> {
    const GRAPHQL_QUERY = gql`
      query getDeposits(
        $address: String!
        $fromBlock: Int!
        $toBlock: Int!
        $transactionType: Int!
      ) {
        transfers(
          where: {
            transactionType_eq: $transactionType
            to: { id_eq: $address }
            blockNumber_gt: $fromBlock
            blockNumber_lte: $toBlock
          }
        ) {
          amount
          blockNumber
          extrinsicHash
          fee
          id
          timestamp
          transactionType
          status
          from {
            id
          }
          to {
            id
          }
        }
      }
    `;

    const data: KiltTransfers = await this.graphQlClient.request(
      GRAPHQL_QUERY,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransferType.TRANSFER,
      },
    );
    return data;
  }

  public async getWalletTransfers(
    address: string,
    fromBlock: number,
    limit: number = null,
  ): Promise<KiltTransfers> {
    const GRAPHQL_QUERY = gql`
      query getTransfers($address: String!, $fromBlock: Int!, $limit: Int) {
        transfers(
          where: {
            AND: [
              {
                OR: [{ to: { id_eq: $address } }, { from: { id_eq: $address } }]
              }
              { blockNumber_gt: $fromBlock }
            ]
          }
          orderBy: blockNumber_ASC
          limit: $limit
        ) {
          amount
          blockNumber
          extrinsicHash
          fee
          id
          timestamp
          transactionType
          status
          from {
            id
          }
          to {
            id
          }
        }
      }
    `;

    const data: KiltTransfers = await this.graphQlClient.request(
      GRAPHQL_QUERY,
      {
        address,
        fromBlock,
        limit,
      },
    );
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
