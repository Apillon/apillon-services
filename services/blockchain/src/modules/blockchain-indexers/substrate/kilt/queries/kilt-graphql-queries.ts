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

  /* Returns all TRANSFERS from a specific account in KILT */
  static ACCOUNT_ALL_TRANSFERS_QUERY = `query getAccountTransfers(
    $account: String!
    $fromBlock: Int!, 
    $limit: Int!
   ) {
    transfers(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          AND: { 
            OR: [{from_eq: $account}, {to_eq: $account}]
          }
        }
      }
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
    ) {
      ${this.BASE_SUBSTRATE_PARAMS}
      account
      attesterId
      claimHash
      fee
    }
  }`;
}
