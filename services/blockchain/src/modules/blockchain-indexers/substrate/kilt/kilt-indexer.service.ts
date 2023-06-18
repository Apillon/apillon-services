import { env } from '@apillon/lib';
import { GraphQLClient, gql } from 'graphql-request';
import { BlockHeight } from '../../block-height';
import { KiltTransactions } from './data-models/kilt-transactions';
import { TransactionType } from '../../../../config/types';
import { KiltGQLQueries } from './queries/kilt-graphql-queries';

export class KiltBlockchainIndexer {
  private graphQlClient: GraphQLClient;

  constructor() {
    if (!env.BLOCKCHAIN_KILT_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }
    this.graphQlClient = new GraphQLClient(env.BLOCKCHAIN_KILT_GRAPHQL_SERVER);
  }

  /* These indicate a transfer from one account -> another */
  public async getAccountTransfers(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.BALANCE_TRANSFER,
      },
    );
    return data;
  }

  /* TODO: What is the difference between withdrawal and transfer FROM OUR_ACC -> X  ??? */
  public async getAccountWithdrawals(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.BALANCE_WITHDRAW,
      },
    );
    return data;
  }

  /* TODO: What is the difference between deposit and transfer FROM Y -> OUR_ACC ??? */
  public async getAccountDeposits(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.BALANCE_DEPOSIT,
      },
    );
    return data;
  }

  /* NOTE: An amount X of balance Y becomes reserved when a did submittion happens.
          In this case, 2 KILT tokens are reserved for the creation of that DID document  
  */
  public async getAccountReserved(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.BALANCE_RESERVE,
      },
    );
    return data;
  }

  public async getAccountDidCreate(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.DID_CREATE,
      },
    );
    return data;
  }

  public async getAccountDidDelete(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.DID_DELETE,
      },
    );
    return data;
  }

  public async getAccountDidUpdate(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: TransactionType.DID_UPDATE,
      },
    );
    return data;
  }

  public async getAccountAttestCreate(
    attesterId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        attesterId,
        fromBlock,
        toBlock,
        transactionType: TransactionType.ATTESTATION_CREATE,
      },
    );
    return data;
  }

  public async getAccountAttestRemove(
    attesterId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        attesterId,
        fromBlock,
        toBlock,
        transactionType: TransactionType.ATTESTATION_REMOVE,
      },
    );
    return data;
  }

  public async getAccountAttestRevoke(
    attesterId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<KiltTransactions> {
    const data: KiltTransactions = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        attesterId,
        fromBlock,
        toBlock,
        transactionType: TransactionType.ATTESTATION_REVOKE,
      },
    );
    return data;
  }

  public async getBlockHeight(): Promise<number> {
    const GRAPHQL_QUERY = gql`
      ${KiltGQLQueries.SYSTEM_BLOCK_HEIGHT_Q}
    `;

    const data: BlockHeight = await this.graphQlClient.request(GRAPHQL_QUERY);
    return data.squidStatus.height;
  }
}
