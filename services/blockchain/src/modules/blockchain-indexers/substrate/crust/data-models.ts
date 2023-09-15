import { BaseTransaction } from '../base-transaction-model';

export interface StorageOrderTransaction extends BaseTransaction {
  readonly fileCid: string | undefined;
  readonly account: string | undefined;
}

export interface TransferTransaction extends BaseTransaction {
  readonly from?: string;
  readonly to?: string;
  readonly amount?: bigint | undefined;
}

export interface SystemEvent extends BaseTransaction {
  readonly account?: string | undefined;
  readonly error?: string;
}
