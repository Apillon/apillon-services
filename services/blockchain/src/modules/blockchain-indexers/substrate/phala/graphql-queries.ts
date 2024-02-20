import { BaseGQLQueries } from '../base-queries';

export class PhalaGqlQueries extends BaseGQLQueries {
  static ACCOUNT_CLUSTER_DEPOSIT_EVENTS_QUERY = `query getAccountClusterDepositEvents(
    $account: String!,
    $fromBlock: Int!,
    $toBlock: Int!
  ) {
    phatContractsTransfereds(
      where: {
        AND: {
          blockNumber_gt: $fromBlock,
          blockNumber_lte: $toBlock,
          to_eq: $account
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
        amount
        clusterId
        fee
        from
        to
    }
  }
  `;

  static ACCOUNT_ALL_TRANSACTIONS_QUERY = `query getAccountTransactions(
    $account: String!
    $fromBlock: Int!,
    $toBlock: Int
    $limit: Int
   ) {
    systems(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          blockNumber_lt: $toBlock,
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
          blockNumber_gte: $fromBlock,
          blockNumber_lt: $toBlock,
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
    phatContractsInstantiatings(
      where: {
        AND: {
          blockNumber_gte: $fromBlock,
          blockNumber_lt: $toBlock,
          account_eq: $account
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      cluster
      contract
      deployer
      fee
    }
  }`;
  static INSTANTIATING_CONTRACTS_BY_HASH_QUERY = `query getContractInstantiatingTransactions(
    $account: String!
    $hashes: [String!]!
   ) {
    phatContractsInstantiatings(
      where: {
        AND: {
          account_eq: $account,
          extrinsicHash_in: $hashes
        }
      }
    ) {
      ${this.BASE_SUBSTRATE_FIELDS}
      account
      cluster
      contract
      deployer
      fee
    }
  }`;
  static CLUSTER_DEPOSIT_BY_HASH_QUERY = `query getClusterDepositTransactions($account: String!, $hashes: [String!]!) {
    phatContractsTransfereds(where: {to_eq: $account, extrinsicHash_in: $hashes}) {
      ${this.BASE_SUBSTRATE_FIELDS}
      amount
      clusterId
      fee
      from
      to
    }
  }
  `;

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
      phatContractsInstantiatings(
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
