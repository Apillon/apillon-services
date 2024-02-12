import { BaseTransaction } from '../base-transaction-model';

export interface SpaceTransaction extends BaseTransaction {
  readonly spaceId: string | undefined;
}

export interface PostTransaction extends BaseTransaction {
  readonly postId: string | undefined;
}
