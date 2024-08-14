import { BaseGQLQueries } from '../base-queries';

export class AcurastGqlQueries extends BaseGQLQueries {
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
    jobRegistrationStoreds(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          account_eq: $account
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      jobId
      from
      fee
    }
  }`;
  static JOB_REGISTRATION_BY_HASH_QUERY = `query getJobRegistrationTransactions(
    $from: String!
    $hashes: [String!]!
   ) {
    jobRegistrationStoreds(
      where: {
        AND: {
          from_eq: $from,
          extrinsicHash_in: $hashes
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      jobId
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
      jobRegistrationStoreds(
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
