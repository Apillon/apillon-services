import { BaseTransaction } from '../base-transaction-model';

export interface JobRegistrationStored extends BaseTransaction {
  readonly from?: string | undefined;
  readonly jobId?: string | undefined;
}
