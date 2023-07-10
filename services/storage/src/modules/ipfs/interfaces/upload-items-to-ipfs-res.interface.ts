import { CID } from 'ipfs-http-client';

export interface uploadItemsToIPFSRes {
  parentDirCID: CID;
  ipfsDirectories: { path: string; cid: CID }[];
  size: number;
}
