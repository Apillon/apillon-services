import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { PhalaGqlQueries } from './graphql-queries';
import { SystemEvent, TransferTransaction } from '../data-models';
import {
  ClusterTransferTransaction,
  PhatContractsInstantiatedTransaction,
  PhatContractsInstantiatingTransaction,
} from './data-models';

export class PhalaBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_PHALA_GRAPHQL_SERVER);
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<SystemEvent[]> {
    const data = await this.graphQlClient.request<{ systems: SystemEvent[] }>(
      gql`
        ${PhalaGqlQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );

    return data.systems;
  }

  /**
   * Method is not used in code, only used in tests
   * @param account
   * @param fromBlock
   * @param toBlock
   */
  public async getAllTransactions(
    account: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const data = await this.graphQlClient.request<{
      systems: SystemEvent;
      transfers: TransferTransaction[];
      phatContractsInstantiatings: PhatContractsInstantiatingTransaction[];
      phatContractsInstantiateds: PhatContractsInstantiatedTransaction[];
    }>(
      gql`
        ${PhalaGqlQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
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
      phatContractsInstantiatings: data.phatContractsInstantiatings,
      phatContractsInstantiateds: data.phatContractsInstantiateds,
    };
  }

  public async getContractInstantiatingTransactions(
    account: string,
    hashes: string[],
  ) {
    const data = await this.graphQlClient.request<{
      phatContractsInstantiatings: PhatContractsInstantiatingTransaction[];
    }>(
      gql`
        ${PhalaGqlQueries.INSTANTIATING_CONTRACTS_BY_HASH_QUERY}
      `,
      {
        account,
        hashes,
      },
    );

    return data.phatContractsInstantiatings;
  }

  public async getClusterDepositTransactions(
    account: string,
    hashes: string[],
  ) {
    const data = await this.graphQlClient.request<{
      clusterTransfers: ClusterTransferTransaction[];
    }>(
      gql`
        ${PhalaGqlQueries.CLUSTER_DEPOSIT_BY_HASH_QUERY}
      `,
      {
        account,
        hashes,
      },
    );

    return data.clusterTransfers;
  }

  public async getAccountBalanceTransfersForTxs(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<{
    transfers: TransferTransaction[];
  }> {
    return await this.graphQlClient.request(
      gql`
        ${PhalaGqlQueries.ACCOUNT_TRANSFERS_BY_BLOCKS}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );
  }

  public async getAccountTransactionsByHash(
    account: string,
    extrinsicHash: string,
  ): Promise<any> {
    return await this.graphQlClient.request(
      gql`
        ${PhalaGqlQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        account,
        extrinsicHash,
      },
    );
  }
}
