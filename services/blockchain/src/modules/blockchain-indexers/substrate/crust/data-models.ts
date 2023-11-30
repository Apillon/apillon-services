import { BaseTransaction } from '../base-transaction-model';

export interface StorageOrderTransaction extends BaseTransaction {
  readonly fileCid: string | undefined;
  readonly account: string | undefined;
}
