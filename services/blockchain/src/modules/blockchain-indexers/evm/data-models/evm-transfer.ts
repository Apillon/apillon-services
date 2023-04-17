import { BlockchainStatus } from '../../blockchain-status';

export interface EvmTransfers {
  transactions: EvmTransfer[];
}

export interface EvmTransfer {
  blockNumber: number;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  id: string;
  nonce: string;
  status: BlockchainStatus;
  timestamp: Date;
  to: string;
  value: string;
}
