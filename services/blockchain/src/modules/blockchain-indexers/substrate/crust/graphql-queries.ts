import { BaseGQLQueries } from '../base-queries';

export class CrustGQLQueries extends BaseGQLQueries {
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
      storageOrders(
        where: {
          AND: {
            blockNumber_gte: $fromBlock,
            blockNumber_lte: $toBlock,
            AND: {
              OR: [{account_eq: $account}]
            }
          }
        }
      )
      {
        ${this.BASE_SUBSTRATE_FIELDS}
        account
        fileCid
      }
    }`;

  /* Returns all SYSTEM events from a specific account in CRUST */
  static ACCOUNT_SYSTEM_EVENTS_QUERY = `query getAccountSystemEvents(
    $account: String!,
    $fromBlock: Int!,
    $toBlock: Int
    ) {
    systems(
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
      error
      fee
    }
  }`;

  /* Returns all transactions releated to STORAGE ORDER from a specific account in CRUST */
  static ACCOUNT_STORAGE_ORDER_QUERY = `query getAccountStorageOrderTransactions(
      $account: String!,
      $fromBlock: Int!,
      $toBlock: Int!,
      $transactionType: String!) {
      storageOrders(
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
        fileCid
      }
    }`;

  static ACCOUNT_TRANSACTION_BY_HASH = `
    query getAccountTransactionsByHash(
      $address: String!
      $extrinsicHash: String!
    ) {
      storageOrders(
        where: {
          extrinsicHash_eq: $extrinsicHash
          account_eq: $address
        }
      ) {
        account
        extrinsicHash
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

  /* Returns TRANSFERS and System events by TransactionType from a specific account in KILT */
  static ACCOUNT_TRANSFERS_BY_BLOCKS = `query getAccountTransfersByTxHashes(
    $account: String!,
    $fromBlock: Int!,
    $toBlock: Int!
   ) {
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
    }
    storageOrders(
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
      fee
      fileCid
      account
    }
  }`;
}
