export class BaseGQLQueries {
  static BASE_SUBSTRATE_FIELDS = `
    id
    blockHash
    blockNumber
    extrinsicId
    extrinsicHash
    transactionType
    createdAt
    status
  `;

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

  /* Returns TRANSFERS by TransactionType from a specific account in KILT */
  static ACCOUNT_TRANSFERS_BY_TYPE_QUERY = `query getAccountTransfers(
    $account: String!
    $fromBlock: Int!,
    $transactionType: String!
    $toBlock: Int,
    $limit: Int
    ) {
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
      limit: $limit
    )
    {
      ${this.BASE_SUBSTRATE_FIELDS}
      from
      to
      amount
      fee
    }
  }`;

  /* Returns TRANSFERS and System events by TransactionType from a specific account in KILT */
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
      ${this.BASE_SUBSTRATE_FIELDS}
      from
      to
      amount
      fee
    }
  }`;
}
