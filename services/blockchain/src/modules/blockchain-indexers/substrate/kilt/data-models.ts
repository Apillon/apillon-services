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
