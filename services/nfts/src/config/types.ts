export enum DbTables {
  TRANSACTION = 'transaction',
  COLLECTION = 'collection',
}

export enum NftsErrorCode {
  //422
  TRANSACTION_CHAIN_ID_NOT_PRESENT = 42212001,
  TRANSACTION_RAW_TRANSACTION_NOT_PRESENT = 42212002,
  TRANSACTION_NONCE_NOT_PRESENT = 42212003,
  TRANSACTION_TYPE_NOT_PRESENT = 42212004,
  COLLECTION_COLLECTION_UUID_NOT_PRESENT = 42212005,
  COLLECTION_PROJECT_UUID_NOT_PRESENT = 42212006,
  COLLECTION_SYMBOL_NOT_PRESENT = 42212006,
  COLLECTION_NAME_NOT_PRESENT = 42212006,
  COLLECTION_MAX_SUPPLY_NOT_PRESENT = 42212006,
  COLLECTION_MINT_PRICE_NOT_PRESENT = 42212006,

  //500
  CREATE_NEW_TRANSACTION_ERROR = 50012001,
  NFT_CONTRACT_OWNER_ERROR = 50012002,
  DEPLOY_NFT_CONTRACT_ERROR = 50012003,
  TRANSFER_NFT_CONTRACT_ERROR = 50012004,
  MINT_NFT_ERROR = 50012005,
  SET_NFT_BASE_URI_ERROR = 50012006,
}

export enum Chains {
  MOONBEAM = 1,
  MOONBASE = 2,
}

export enum TransactionType {
  DEPLOY_CONTRACT = 1,
  TRANSFER_CONTRACT_OWNERSHIP = 2,
  MINT_NFT = 3,
  SET_COLLECTION_BASE_URI = 4,
}

export enum TransactionStatus {
  REQUESTED = 0,
  PENDING = 1,
  FINISHED = 2,
  VERIFIED = 3,
  FAILED = 4,
}

export enum CollectionStatus {
  PENDING = 0,
  DEPLOYED = 1,
  TRANSFERED = 2,
}
