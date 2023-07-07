import { BlockchainStatus } from '../../../blockchain-status';

export interface CrustStorageOrders {
  storageOrders: CrustStorageOrder[];
}

export interface CrustStorageOrder {
  id: string;
  fileCid: string;
  fee: string;
  extrinsicHash: string;
  extrinisicId: string;
  createdAt: Date;
  blockNum: number;
  blockHash: string;
  account: { id: string };
  status: BlockchainStatus;
}
