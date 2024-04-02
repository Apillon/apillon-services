import { BaseGQLQueries } from '../base-queries';

export class KiltGQLQueries extends BaseGQLQueries {
  // NOTE: These params are always present
  static ACCOUNT_ALL_TRANSACTIONS_QUERY = `query getAccountTransactions(
    $account: String!
    $fromBlock: Int!,
    $toBlock: Int
    $limit: Int
   ) {
    systems(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          account_eq: $account
        }
      }
      limit: $limit
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      error
      fee
    },
    transfers(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          AND: {
            OR: [{from_eq: $account}, {to_eq: $account}]
          }
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      from
      to
      amount
      fee
    },
    dids(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          account_eq: $account
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      didId
      fee
    },
    attestations(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          AND: {
            OR: [{account_eq: $account}, {attesterId_eq: $account}]
          }
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      attesterId
      claimHash
      fee
    }
  }`;

  /* Returns all transactions releated to DID from a specific account in KILT */
  static ACCOUNT_DID_QUERY = `query getAccountDidTransactions(
    $account: String!,
    $fromBlock: Int!,
    $toBlock: Int!,
    $transactionType: String!) {
    dids(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          blockNumber_lte: $toBlock,
          transactionType_eq: $transactionType,
          account_eq: $account
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      didId
      fee
    }
  }`;

  /* Returns all attestations performed by attesterId */
  static ACCOUNT_ATTESTATIONS_QUERY = `query getAccountAttestations(
      $account: String!,
      $fromBlock: Int!
      $toBlock: Int!
      $transactionType: String!
    ) {
    attestations(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          transactionType_eq: $transactionType,
          AND: {
            OR: [{attesterId_eq: $account}, {account_eq: $account}]
          }
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      attesterId
      claimHash
      fee
    }
  }`;

  static ACCOUNT_TRANSACTION_BY_HASH = `
    query getAccountTransactionsByHash($address: String!, $extrinsicHash: String!) {
      attestations(where: {account_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
      dids(where: {account_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
      transfers(where: {from_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
      systems(where: {account_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
    }
  `;
}
