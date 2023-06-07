import { BlockchainStatus } from '../../../blockchain-status';

export interface KiltTransfers {
  transfers: KiltTransfer[];
}

export interface KiltTransfer {
  id: string;
  fee: string;
  extrinsicHash: string;
  blockNumber: number;
  amount: string;
  timestamp: Date;
  transactionType: number;
  from: { id: string };
  to: { id: string };
  status: BlockchainStatus;
}
