import { env } from '@apillon/lib';
import { GraphQLClient, gql } from 'graphql-request';
import { CrustTransferType } from '../../../config/types';
import { BlockHeight } from '../block-height';
import { CrustStorageOrders } from './data-models/crust-storage-orders';
import { CrustTransfers } from './data-models/crust-transfers';

export class CrustBlockchainIndexer {
  private graphQlClient: GraphQLClient;

  constructor() {
    if (!env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }
    this.graphQlClient = new GraphQLClient(env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER);
  }

  public async getWalletWitdrawals(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<CrustTransfers> {
    const GRAPHQL_QUERY = gql`
      query getWitdrawals(
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

    const data: CrustTransfers = await this.graphQlClient.request(
      GRAPHQL_QUERY,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: CrustTransferType.TRANSFER,
      },
    );
    return data;
  }

  public async getWalletDeposits(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<CrustTransfers> {
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

    const data: CrustTransfers = await this.graphQlClient.request(
      GRAPHQL_QUERY,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: CrustTransferType.TRANSFER,
      },
    );
    return data;
  }

  public async getMarketFileOrders(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<CrustStorageOrders> {
    const GRAPHQL_QUERY = gql`
      query getFileOrders($address: String!, $fromBlock: Int!, $toBlock: Int!) {
        storageOrders(
          where: {
            account: { id_eq: $address }
            blockNum_gt: $fromBlock
            blockNum_lte: $toBlock
          }
        ) {
          id
          fileCid
          fee
          extrinsicHash
          extrinisicId
          createdAt
          blockNum
          blockHash
          status
          account {
            id
          }
        }
      }
    `;

    const data: CrustStorageOrders = await this.graphQlClient.request(
      GRAPHQL_QUERY,
      { address, fromBlock, toBlock },
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
