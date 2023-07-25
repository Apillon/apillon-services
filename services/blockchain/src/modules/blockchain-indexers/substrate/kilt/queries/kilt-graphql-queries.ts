export enum KiltGQLQueries {
  // NOTE: These params are always present
  BASE_SUBSTRATE_PARAMS_Q = `
    id
    blockHash
    blockNumber
    extrinsicId
    extrinsicHash
    transactionType
    createdAt
    status
  `,

  /* Returns all TRANSFERS from a specific account in KILT */
  ACCOUNT_TRANSFERS_Q = `query getAccountTransfers(
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
      ${BASE_SUBSTRATE_PARAMS_Q}
      from
      to
      amount
      fee
    }
  }`,

  /* Returns all SYSTEM events from a specific account in KILT */
  ACCOUNT_SYSTEM_EVENTS_QUERY = `query getAccountSystemEvents(
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
      ${BASE_SUBSTRATE_PARAMS_Q}
      account
      error
      fee
    }
  }`,

  /* Returns all transactions releated to DID from a specific account in KILT */
  ACCOUNT_DID_Q = `query getAccountDidTransactions(
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
      ${BASE_SUBSTRATE_PARAMS_Q}
      account
      didId
      fee
    }
  }`,

  /* Returns all attestations performed by attesterId */
  ACCOUNT_ATTESTATIONS_Q = `query getAccountAttestations(
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
      ${BASE_SUBSTRATE_PARAMS_Q}
      account
      attesterId
      claimHash
      fee
    }
  }`,
}
