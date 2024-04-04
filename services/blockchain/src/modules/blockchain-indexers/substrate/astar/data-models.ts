import { BaseTransaction } from '../base-transaction-model';

export interface ContractTransaction extends BaseTransaction {
  readonly account?: string | undefined;
  readonly contractAddress?: string | undefined;
}
