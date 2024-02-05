export interface uploadItemsToIPFSRes {
  parentDirCID: string;
  ipfsDirectories: { path: string; cid: string }[];
  size: number;
}
