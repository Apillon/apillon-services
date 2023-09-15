import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { KiltTransactionType } from '../../../../config/types';
import {
  AttestationTransaction,
  DidTransaction,
  SystemEvent,
  TransferTransaction,
} from './data-models/kilt-transactions';
import { KiltGQLQueries } from './queries/kilt-graphql-queries';

export class KiltBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    if (!env.BLOCKCHAIN_KILT_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }

    super(env.BLOCKCHAIN_KILT_GRAPHQL_SERVER);
  }

  public async getAllTransactions(
    account: string,
    fromBlock: number,
    toBlock: number,
  ) {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ALL_TRANSACTIONS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
      },
    );

    return {
      transfers: data.transfers,
      dids: data.dids,
      attestations: data.attestations,
      systems: data.systems,
    };
  }

  public async getAllSystemEvents(
    account: string,
    fromBlock: number,
    toBlock?: number,
    limit?: number,
  ): Promise<SystemEvent[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_SYSTEM_EVENTS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        limit,
      },
    );

    return data.systems;
  }

  /* These indicate a balance transfer from one account -> another */
  public async getAccountBalanceTransfers(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_TRANSFER,
      },
    );

    return data.transfers;
  }

  /* These indicate a balance transfer from one account -> another */
  public async getAccountBalanceTransfersForTxs(
    account: string,
    hashes: string[],
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_BY_TX_HASHES_QUERY}
      `,
      {
        account,
        hashes,
      },
    );

    return data.transfers;
  }

  /* TODO: What is the difference between withdrawal and transfer FROM OUR_ACC -> X  ??? */
  public async getAccountWithdrawals(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_WITHDRAW,
      },
    );
    return data.transfers;
  }

  /* TODO: What is the difference between deposit and transfer FROM Y -> OUR_ACC ??? */
  public async getAccountDeposits(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_DEPOSIT,
      },
    );
    return data.transfers;
  }

  /* NOTE: An amount X of balance Y becomes reserved when a did submitting happens.
     In this case, 2 KILT tokens are reserved for the creation of that DID document
  */
  public async getAccountReserved(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_RESERVED,
      },
    );

    return data.transfers;
  }

  public async getAccountUnreserved(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_BY_TYPE_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_UNRESERVED,
      },
    );

    return data.transfers;
  }

  public async getAccountDidCreate(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<DidTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.DID_CREATE,
      },
    );
    return data.dids;
  }

  public async getAccountDidDelete(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<DidTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.DID_DELETE,
      },
    );
    return data.dids;
  }

  public async getAccountDidUpdate(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<DidTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.DID_UPDATE,
      },
    );
    return data.dids;
  }

  public async getAccountAttestCreate(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_CREATE,
      },
    );
    return data.attestations;
  }

  public async getAccountAttestRemove(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_REMOVE,
      },
    );
    return data.attestations;
  }

  public async getAccountAttestRevoke(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_QUERY}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_REVOKE,
      },
    );
    return data.attestations;
  }

  public async getAccountTransactionsByHash(
    address: string,
    extrinsicHash: string,
  ): Promise<any> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSACTION_BY_HASH}
      `,
      {
        address,
        extrinsicHash,
      },
    );

    return data;
  }
}
