import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { AcurastGqlQueries } from './graphql-queries';
import { SystemEvent, TransferTransaction } from '../data-models';
import { JobRegistrationStored } from './data-models';

export class AcurastBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_ACURAST_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_ACURAST_GRAPHQL_SERVER);
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<SystemEvent[]> {
    const data = await this.graphQlClient.request<{ systems: SystemEvent[] }>(
      gql`
        ${AcurastGqlQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
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
      jobRegistrationStoreds: JobRegistrationStored[];
    }>(
      gql`
        ${AcurastGqlQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
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
      jobRegistrationStoreds: data.jobRegistrationStoreds,
    };
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
        ${AcurastGqlQueries.ACCOUNT_TRANSFERS_BY_BLOCKS}
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
        ${AcurastGqlQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        account,
        extrinsicHash,
      },
    );
  }

  public async getJobRegistrationTransactions(from: string, hashes: string[]) {
    const data = await this.graphQlClient.request<{
      jobRegistrationStoreds: JobRegistrationStored[];
    }>(
      gql`
        ${AcurastGqlQueries.JOB_REGISTRATION_BY_HASH_QUERY}
      `,
      {
        from,
        hashes,
      },
    );

    return data.jobRegistrationStoreds;
  }
}
