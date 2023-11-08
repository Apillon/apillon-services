import { BaseTransaction } from '../base-transaction-model';

export interface PhatContractsInstantiatingTransaction extends BaseTransaction {
  readonly account?: string | undefined;
  readonly cluster?: string | undefined;
  readonly contract?: string | undefined;
}
