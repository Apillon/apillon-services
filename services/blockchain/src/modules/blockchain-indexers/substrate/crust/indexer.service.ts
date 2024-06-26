import { env } from '@apillon/lib';
import { gql } from 'graphql-request';

import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { CrustGQLQueries } from './graphql-queries';
import { StorageOrderTransaction } from './data-models';
import { SystemEvent, TransferTransaction } from '../data-models';
import { CrustTransactionType } from '../../../../config/types';

export class CrustBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER);
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
        ${CrustGQLQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
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
      storageOrders: data.storageOrders,
    };
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<SystemEvent[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${CrustGQLQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );

    return data.systems;
  }

  /* These indicate a balance transfer from one account -> another */
  public async getAccountBalanceTransfers(
    account: string,
    fromBlock: number,
    limit: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${CrustGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        account,
        fromBlock,
        limit,
        transactionType: CrustTransactionType.BALANCE_TRANSFER,
      },
    );

    return data.transfers;
  }

  /* These indicate a balance transfer from one account -> another */
  public async getAccountBalanceTransfersForTxs(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<{
    transfers: TransferTransaction[];
    storageOrders: StorageOrderTransaction[];
  }> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${CrustGQLQueries.ACCOUNT_TRANSFERS_BY_BLOCKS}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );

    return data;
  }

  public async getAccountTransactionsByHash(
    address: string,
    extrinsicHash: string,
  ): Promise<any> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${CrustGQLQueries.ACCOUNT_TRANSACTION_BY_HASH}
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
        ${CrustGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        address,
        extrinsicHash,
      },
    );

    return data;
  }
}
