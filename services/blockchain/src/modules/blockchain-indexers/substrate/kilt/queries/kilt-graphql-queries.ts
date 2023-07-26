export class KiltGQLQueries {
  // NOTE: These params are always present
  static BASE_SUBSTRATE_PARAMS = `
    id
    blockHash
    blockNumber
    extrinsicId
    extrinsicHash
    transactionType
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
          blockNumber_lt: $toBlock,
          account_eq: $account
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_PARAMS}
      account
      error
      fee
    },
    transfers(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          blockNumber_lt: $toBlock,
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
      fee
    },
    dids(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          blockNumber_lt: $toBlock,
          account_eq: $account
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_PARAMS}
      account
      didId
      fee
    },
    attestations(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          blockNumber_lt: $toBlock,
          AND: { 
            OR: [{account_eq: $account}, {attesterId_eq: $account}]
          }
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_PARAMS}
      account
      attesterId
      claimHash
      fee
    }
  }`;

  /* Returns TRANSFERS by TransactionType from a specific account in KILT */
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
      fee
    }
  }`;

  /* Returns TRANSFERS and System events by TransactionType from a specific account in KILT */
  static ACCOUNT_TRANSFERS_BY_TYPE_WITH_LIMIT_QUERY = `query getAccountTransfers(
    $account: String!
    $fromBlock: Int!, 
    $limit: Int!,
    $transactionType: String!) {
    transfers(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          transactionType_eq: $transactionType,
          AND: { 
            OR: [{from_eq: $account}, {to_eq: $account}]
          }
        }
      },
      limit: $limit
    )
    {
      ${this.BASE_SUBSTRATE_PARAMS}
      from
      to
      amount
      fee
    }
  }`;

  /* Returns all SYSTEM events from a specific account in KILT */
  static ACCOUNT_SYSTEM_EVENTS_QUERY = `query getAccountSystemEvents(
    $account: String!
    $fromBlock: Int!, 
    $toBlock: Int!) {
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
      fee
    }
  }`;

  /* Returns SYSTEM events for specific extrinsic hashes */
  static ACCOUNT_SYSTEM_EVENTS_FOR_TXS_QUERY = `query getAccountSystemEventsForTxs(
    $account: String!
    $hashes: [String!]!) {
    systems(
      where: {
        AND: {
          account_eq: $account
          extrinsicHash_in: $hashes
        }
      }
    )
    {
      ${this.BASE_SUBSTRATE_PARAMS}
      account
      error
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
      ${this.BASE_SUBSTRATE_PARAMS}
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
          blockNumber_gte: $fromBlock,
          blockNumber_lte: $toBlock,
          transactionType_eq: $transactionType,
          AND: { 
            OR: [{attesterId_eq: $account}, {account_eq: $account}]
          }
        }
      }
    ) 
    {
      ${this.BASE_SUBSTRATE_PARAMS}
      account
      attesterId
      claimHash
      fee
    }
  }`;
}
