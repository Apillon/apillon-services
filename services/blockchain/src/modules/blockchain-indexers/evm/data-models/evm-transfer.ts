import { BlockchainStatus } from '../../blockchain-status';

export interface EvmTransfers {
  transactions: EvmTransfer[];
}

export interface EvmTransfer {
  id: number;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  blockTimestamp: Date;
  from: string;
  to: string;
  value: string;
  nonce: number;
  gasUsed: string;
  effectiveGasPrice: string;
  status: BlockchainStatus;
  createdAt: Date;
}
