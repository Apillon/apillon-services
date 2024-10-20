import { BaseGQLQueries } from '../base-queries';

export class UniqueGqlQueries extends BaseGQLQueries {
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
    collectionCreateds(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          account_eq: $account
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      collectionId
      from
      fee
    }
  }`;
  static COLLECTION_CREATED_BY_HASH_QUERY = `query getCollectionCreatedTransactions(
    $from: String!
    $hashes: [String!]!
   ) {
    collectionCreateds(
      where: {
        AND: {
          from_eq: $from,
          extrinsicHash_in: $hashes
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      collectionId
      from
      fee
    }
  }`;

  static ACCOUNT_TRANSACTION_BY_HASH = `
    query getAccountTransactionsByHash(
      $account: String!
      $extrinsicHash: String!
    ) {
      transfers(
        where: { from_eq: $account, extrinsicHash_eq: $extrinsicHash }
      ) {
        extrinsicHash
        from
      }
      systems(
        where: { account_eq: $account , extrinsicHash_eq: $extrinsicHash }
      ) {
        extrinsicHash
      },
      collectionCreateds(
        where: {
          AND: {
            from_eq: $account,
            extrinsicHash_eq: $extrinsicHash
          }
        }
      ) {
        from
        extrinsicHash
      }
    }
  `;
}
