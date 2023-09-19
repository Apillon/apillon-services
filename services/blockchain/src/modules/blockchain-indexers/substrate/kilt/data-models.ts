import { BaseTransaction } from '../base-transaction-model';

export interface DidTransaction extends BaseTransaction {
  readonly didId?: string | undefined;
  readonly account?: string | undefined;
}

export interface AttestationTransaction extends BaseTransaction {
  readonly account?: string | undefined;
  readonly attesterId?: string | undefined;
  readonly claimHash?: string;
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
