import { BaseGQLQueries } from '../base-queries';

export class PhalaGqlQueries extends BaseGQLQueries {
  static ACCOUNT_TRANSACTION_BY_HASH = `
    query getAccountTransactionsByHash(
      $address: String!
      $extrinsicHash: String!
    ) {
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
}
