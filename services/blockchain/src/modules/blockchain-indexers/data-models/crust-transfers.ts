export interface CrustTransfers {
  transfers: CrustTransfer[];
}

export interface CrustTransfer {
  id: string;
  fee: string;
  extrinsicHash: string;
  blockNumber: number;
  amount: string;
  timestamp: Date;
  transactionType: number;
  from: { id: string };
  to: { id: string };
}
