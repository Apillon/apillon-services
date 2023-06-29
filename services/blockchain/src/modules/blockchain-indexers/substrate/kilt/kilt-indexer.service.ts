import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { KiltTransactionType } from '../../../../config/types';
import {
  AttestationTransation,
  DidTransaction,
  TransferTransaction,
} from './data-models/kilt-transactions';
import { KiltGQLQueries } from './queries/kilt-graphql-queries';

export class KiltBlockchainIndexer extends BaseBlockchainIndexer {
  constructor() {
    // TODO: Change to KILT
    if (!env.BLOCKCHAIN_KILT_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }
    super(env.BLOCKCHAIN_KILT_GRAPHQL_SERVER);
  }

  public async getAllTransactions(
    account: string,
    fromBlock: number,
    toBlock: number,
    // TODO: Filter by state as well
    // state?: string,
  ) {
    return {
      transfers_transfers: await this.getAccountTransfers(
        account,
        fromBlock,
        toBlock,
      ),
      withdrawals: await this.getAccountWithdrawals(
        account,
        fromBlock,
        toBlock,
      ),
      deposits: await this.getAccountDeposits(account, fromBlock, toBlock),
      reserved_balance: await this.getAccountReserved(
        account,
        fromBlock,
        toBlock,
      ),
      did_create: await this.getAccountDidCreate(account, fromBlock, toBlock),
      did_delete: await this.getAccountDidDelete(account, fromBlock, toBlock),
      did_update: await this.getAccountDidUpdate(account, fromBlock, toBlock),
      attestattions_create: await this.getAccountAttestCreate(
        account,
        fromBlock,
        toBlock,
      ),
      attestattions_remove: await this.getAccountAttestRemove(
        account,
        fromBlock,
        toBlock,
      ),
      attestattions_revoke: await this.getAccountAttestRevoke(
        account,
        fromBlock,
        toBlock,
      ),
    };
  }

  /* These indicate a transfer from one account -> another */
  public async getAccountTransfers(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
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

  /* TODO: What is the difference between withdrawal and transfer FROM OUR_ACC -> X  ??? */
  public async getAccountWithdrawals(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
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
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
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

  /* NOTE: An amount X of balance Y becomes reserved when a did submittion happens.
          In this case, 2 KILT tokens are reserved for the creation of that DID document  
  */
  public async getAccountReserved(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: any = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_RESERVE,
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
        ${KiltGQLQueries.ACCOUNT_DID_Q}
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
        ${KiltGQLQueries.ACCOUNT_DID_Q}
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
        ${KiltGQLQueries.ACCOUNT_DID_Q}
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
  ): Promise<AttestationTransation[]> {
    const data: AttestationTransation[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_CREATE,
      },
    );
    return data;
  }

  public async getAccountAttestRemove(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransation[]> {
    const data: AttestationTransation[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_REMOVE,
      },
    );
    return data;
  }

  public async getAccountAttestRevoke(
    account: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransation[]> {
    const data: AttestationTransation[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        account,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_REVOKE,
      },
    );
    return data;
  }
}
