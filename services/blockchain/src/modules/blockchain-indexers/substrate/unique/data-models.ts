import { BaseTransaction } from '../base-transaction-model';

export interface CollectionCreated extends BaseTransaction {
  readonly from?: string | undefined;
  readonly collectionId?: number;
}
