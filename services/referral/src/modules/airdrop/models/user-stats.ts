export interface UserStats {
  email: string;
  user_uuid: string;
  project_count: number;
  project_uuids: string[];
  subscriptions: number;
  buy_count: number;
  buy_amount: number;
  spend_count: number;
  spend_amount: number;
  bucket_count: number;
  file_count: number;
  ipns_count: number;
  www_count: number;
  www_domain_count: number;
  nft_count: number;
  social_count: number;
  comp_count: number;
  id_count: number;
  key_count: number;
  apiKeys: string[][];
  coworker_count: number;
  referral_count: number;
  referrals: string[][];
}

// Define a mapping for tasks to points
export const taskPoints = {
  register: 10,
  projectCreated: 1,
  bucketCreated: 1,
  fileUploaded: 1,
  ipnsCreated: 1,
  websiteCreated: 1,
  domainLinked: 10,
  nftCollectionCreated: 10,
  onSubscriptionPlan: 20,
  creditsPurchased: 5,
  grillChatCreated: 1,
  computingContractCreated: 0,
  kiltIdentityCreated: 10,
  collaboratorAdded: 1,
  usersReferred: 2,
  websiteUploadedViaApi: 5,
  identitySdkUsed: 2,
  fileUploadedViaApi: 5,
  nftMintedApi: 5,
};
