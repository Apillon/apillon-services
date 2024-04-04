import { BaseGQLQueries } from '../base-queries';

export class AstarGqlQueries extends BaseGQLQueries {
  // TODO: cleanup update and test
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
    contracts(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          account_eq: $account
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      contract
      fee
    }
  }`;
  static INSTANTIATING_CONTRACTS_BY_HASH_QUERY = `query getContracts(
    $account: String!
    $hashes: [String!]!
   ) {
    contracts(
      where: {
        AND: {
          account_eq: $account,
          extrinsicHash_in: $hashes
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      contract
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
      contracts(
        where: {
          AND: {
            account_eq: $account,
            extrinsicHash_eq: $extrinsicHash
          }
        }
      ) {
        account
        extrinsicHash
      }
    }
  `;
}
