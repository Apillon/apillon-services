export class CrustGQLQueries {
  // NOTE: These params are always present
  static BASE_SUBSTRATE_PARAMS = `
      id
      blockHash
      blockNumber
      extrinsicId
      extrinsicHash
      transactionType
      fee
      createdAt
      status
    `;

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
        ${this.BASE_SUBSTRATE_PARAMS}
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
        ${this.BASE_SUBSTRATE_PARAMS}
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
        ${this.BASE_SUBSTRATE_PARAMS}
        account
        fileCid
      }
    }`;

  /* Returns TRANSFERS by TransactionType from a specific account in CRUST */
  static ACCOUNT_TRANSFERS_BY_TYPE_QUERY = `query getAccountTransfers(
      $account: String!
      $fromBlock: Int!, 
      $toBlock: Int!,
      $transactionType: String!) {
      transfers(
        where: {
          AND: {
            blockNumber_gte: $fromBlock,
            blockNumber_lte: $toBlock,
            transactionType_eq: $transactionType,
            AND: { 
              OR: [{from_eq: $account}, {to_eq: $account}]
            }
          }
        }
      )
      {
        ${this.BASE_SUBSTRATE_PARAMS}
        from
        to
        amount
      }
    }`;

  /* Returns TRANSFERS and System events by TransactionType from a specific account in CRUST */
  static ACCOUNT_TRANSFERS_BY_TX_HASHES_QUERY = `query getAccountTransfersByTxHashes(
      $account: String!,
      $hashes: [String!]!
     ) {
      transfers(
        where: {
          AND: {
            extrinsicHash_in: $hashes,
            AND: { 
              OR: [{from_eq: $account}, {to_eq: $account}]
            }
          }
        }
      )
      {
        ${this.BASE_SUBSTRATE_PARAMS}
        from
        to
        amount
      }
    }`;

  /* Returns all SYSTEM events from a specific account in CRUST */
  static ACCOUNT_SYSTEM_EVENTS_QUERY = `query getAccountSystemEvents(
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
        ${this.BASE_SUBSTRATE_PARAMS}
        account
        error
      }
    }`;

  /* Returns SYSTEM events for specific extrinsic hashes */
  static ACCOUNT_SYSTEM_EVENTS_WITH_LIMIT_QUERY = `query getAccountSystemEventsWithLimit(
      $account: String!,
      $fromBlock: Int!,
      $limit: Int!
      ) {
      systems(
        where: {
          AND: {
            account_eq: $account
            blockNumber_gte: $fromBlock,
          }
        },
        limit: $limit
      )
      {
        ${this.BASE_SUBSTRATE_PARAMS}
        account
        error
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
        ${this.BASE_SUBSTRATE_PARAMS}
        account
        fileCid
      }
    }`;

  static ACCOUNT_WALLET_TRANSACTION_BY_HASH = `
    query getWalletTransactionsByHash(
      $address: String!
      $extrinsicHash: String!
    ) {
      storageOrders(
        where: {
          extrinsicHash_eq: $extrinsicHash
          account: $address
        }
      ) {
        account
        extrinsicHash
      }
      transfers(
        where: { extrinsicHash_eq: $extrinsicHash, from: $address }
      ) {
        extrinsicHash
        from
      }
    }
  `;
}
