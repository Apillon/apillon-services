import { CID } from 'ipfs-http-client';

export interface uploadFilesToIPFSRes {
  parentDirCID: CID;
  ipfsDirectories: { path: string; cid: CID }[];
  size: number;
}
