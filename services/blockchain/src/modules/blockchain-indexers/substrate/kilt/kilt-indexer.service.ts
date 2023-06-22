import { gql } from 'graphql-request';
import { env } from '@apillon/lib';
import { BaseBlockchainIndexer } from '../base-blockchain-indexer';
import { BlockHeight } from '../../block-height';
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
    if (!env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER) {
      throw new Error('Missing GraphQL server url!');
    }
    super(env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER);
  }

  /* These indicate a transfer from one account -> another */
  public async getAccountTransfers(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: TransferTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_TRANSFER,
      },
    );
    return data;
  }

  /* TODO: What is the difference between withdrawal and transfer FROM OUR_ACC -> X  ??? */
  public async getAccountWithdrawals(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: TransferTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_WITHDRAW,
      },
    );
    return data;
  }

  /* TODO: What is the difference between deposit and transfer FROM Y -> OUR_ACC ??? */
  public async getAccountDeposits(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<TransferTransaction[]> {
    const data: TransferTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_DEPOSIT,
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
  ): Promise<TransferTransaction[]> {
    const data: TransferTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_TRANSFERS_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.BALANCE_RESERVE,
      },
    );
    return data;
  }

  public async getAccountDidCreate(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<DidTransaction[]> {
    const data: DidTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.DID_CREATE,
      },
    );
    return data;
  }

  public async getAccountDidDelete(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<DidTransaction[]> {
    const data: DidTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.DID_DELETE,
      },
    );
    return data;
  }

  public async getAccountDidUpdate(
    address: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<DidTransaction[]> {
    const data: DidTransaction[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_DID_Q}
      `,
      {
        address,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.DID_UPDATE,
      },
    );
    return data;
  }

  public async getAccountAttestCreate(
    attesterId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransation[]> {
    const data: AttestationTransation[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        attesterId,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_CREATE,
      },
    );
    return data;
  }

  public async getAccountAttestRemove(
    attesterId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransation[]> {
    const data: AttestationTransation[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        attesterId,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_REMOVE,
      },
    );
    return data;
  }

  public async getAccountAttestRevoke(
    attesterId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<AttestationTransation[]> {
    const data: AttestationTransation[] = await this.graphQlClient.request(
      gql`
        ${KiltGQLQueries.ACCOUNT_ATTESTATIONS_Q}
      `,
      {
        attesterId,
        fromBlock,
        toBlock,
        transactionType: KiltTransactionType.ATTESTATION_REVOKE,
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
