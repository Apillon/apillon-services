import { BaseTransaction } from './base-transaction-model';

export interface BaseContractTransaction extends BaseTransaction {
  readonly account?: string | undefined;
  readonly contract?: string | undefined;
}
