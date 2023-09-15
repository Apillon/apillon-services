export interface BaseTransaction {
  readonly id: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly extrinsicId: string;
  readonly extrinsicHash: string;
  readonly transactionType: string;
  readonly fee: bigint;
  readonly createdAt: Date;
  readonly status: number;
}
