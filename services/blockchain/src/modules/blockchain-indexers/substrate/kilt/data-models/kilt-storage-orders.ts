import { BlockchainStatus } from '../../../blockchain-status';

export interface KiltStorageOrders {
  storageOrders: KiltStorageOrder[];
}

export interface KiltStorageOrder {
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
