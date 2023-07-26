interface BaseTransaction {
  // TODO: I suggest we put this in a library and use in Crust as well
  readonly id: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly extrinsicId: string;
  readonly extrinsicHash: string;
  readonly transactionType: string;
  readonly createdAt: Date;
  readonly status: number;
}

export interface DidTransaction extends BaseTransaction {
  didId?: string | undefined;
  account?: string | undefined;
  fee: bigint;
}

export interface AttestationTransaction extends BaseTransaction {
  account?: string | undefined;
  attesterId?: string | undefined;
  claimHash?: string;
  fee: bigint;
}

export interface TransferTransaction extends BaseTransaction {
  from?: string;
  to?: string;
  amount?: bigint | undefined;
  fee: bigint;
}

export interface SystemEvent extends BaseTransaction {
  account?: string | undefined;
  error?: string;
}
