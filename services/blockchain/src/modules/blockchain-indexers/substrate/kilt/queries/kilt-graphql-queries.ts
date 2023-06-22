export enum KiltGQLQueries {
  /* Returns all TRANSFERS from a specific account in KILT */
  ACCOUNT_TRANSFERS_Q = `query getAccountTransfers(
      $address: String!
      $fromBlock: Int!
      $toBlock: Int!
      $transactionType: String!
    ) {
      transfers(
        where: {
          OR: [
            {from_eq: $address},
            {to_eq: $address}
          ],
          AND: [
            { blockNumber_gte: $fromBlock }
            { blockNumber_lte: $toBlock }
          ],
          transactionType_eq: $transactionType
        }
      ) {
        id
        from
        to
        amount
        fee
        createdAt
        transactionType
        status
      }
    }`,

  /* Returns all transactions releated to DID from a specific account in KILT */
  ACCOUNT_DID_Q = `query getAccountDidTransactions(
      $account: String!
      $fromBlock: Int!
      $toBlock: Int!
      $transactionType: String!
    ) {
      dids(
        where: {
          account_eq: $account,
          transactionType_eq: $transactionType,
          AND: [
            { blockNumber_gte: $fromBlock }
            { blockNumber_lte: $toBlock }
          ]
        }
      ) {
        id
        account
        didId
        amount
        fee
        createdAt
        transactionType
        status
      }
    }`,

  /* Returns all attestations performed by attesterId */
  ACCOUNT_ATTESTATIONS_Q = `query getAccountAttestations(
      $attesterId: String!
      $fromBlock: Int!
      $toBlock: Int!
      $transactionType: String!
    ) {
      dids(
        where: {
          attesterId_eq: $attesterId,
          transactionType_eq: $transactionType,
          AND: [
            { blockNumber_gte: $fromBlock }
            { blockNumber_lte: $toBlock }
          ]
        }
      ) {
        id
        account
        attesterId
        claimHash
        fee
        createdAt
        transactionType
        status
      }
    }`,
}
