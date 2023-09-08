interface BaseTransaction {
  // TODO: I suggest we put this in a library and use in Crust as well
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

export interface StorageOrderTransaction extends BaseTransaction {
  fileCid: string | undefined;
  account: string | undefined;
}

export interface TransferTransaction extends BaseTransaction {
  from?: string;
  to?: string;
  amount?: bigint | undefined;
}

export interface SystemEvent extends BaseTransaction {
  account?: string | undefined;
  error?: string;
}
