import { BaseGQLQueries } from '../base-queries';
export class SubsocialGQLQueries extends BaseGQLQueries {
  static ACCOUNT_ALL_TRANSACTIONS_QUERY = `query getAccountTransactions(
      $account: String!
      $fromBlock: Int!, 
      $toBlock: Int!
     ) {
      systems(
        where: {
          AND: {
            blockNumber_gte: $fromBlock,
            blockNumber_lte: $toBlock,
            account_eq: $account
          }
        }
      )
      {
        ${this.BASE_SUBSTRATE_FIELDS}
        account
        error
      },
      transfers(
        where: {
          AND: {
            blockNumber_gte: $fromBlock,
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
      },
      spaces(
        where: {
          AND: {
            blockNumber_gte: $fromBlock,
            blockNumber_lte: $toBlock,
            account_eq: $account
          }
        }
      )
      {
        ${this.BASE_SUBSTRATE_FIELDS}
        account
        spaceId
      },
      posts(
        where: {
          AND: {
            blockNumber_gte: $fromBlock,
            blockNumber_lte: $toBlock,
            account_eq: $account
          }
        }
      )
      {
        ${this.BASE_SUBSTRATE_FIELDS}
        account
        postId
      }
    }`;

  /* Returns all SYSTEM events from a specific account */
  static ACCOUNT_SYSTEM_EVENTS_QUERY = `query getAccountSystemEvents(
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
    }
  }`;

  static ACCOUNT_TRANSACTION_BY_HASH = `
    query getAccountTransactionsByHash(
      $address: String!
      $extrinsicHash: String!
    ) {
      spaces(
        where: {
          extrinsicHash_eq: $extrinsicHash
          account_eq: $account
        }
      ) {
        extrinsicHash
        account
      }
      posts(
        where: {
          extrinsicHash_eq: $extrinsicHash
          account_eq: $account
        }
      ) {
        extrinsicHash
        account
      }
      transfers(
        where: { extrinsicHash_eq: $extrinsicHash, from_eq: $address }
      ) {
        extrinsicHash
        from
      }
      systems(
        where: { account_eq: $address , extrinsicHash_eq: $extrinsicHash }
      ) {
        extrinsicHash
      }
    }
  `;

  /* Returns TRANSFERS and System events by TransactionType from a specific account */
  static ACCOUNT_TRANSFERS_BY_TX_HASHES_QUERY = `query getAccountTransfersByTxHashes(
    $account: String!,
    $hashes: [String!]!
   ) {
    transfers(
      where: {
        AND: {
          extrinsicHash_in: $hashes,
          OR: [{from_eq: $account}, {to_eq: $account}]          
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      from
      to
      amount
      fee
    }
  }`;
}
