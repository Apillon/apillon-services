export enum DbTables {
  TRANSACTION = 'transaction',
  COLLECTION = 'collection',
  CONTRACT_VERSION = 'contract_version',
}

export enum NftsErrorCode {
  //400
  COLLECTION_ALREADY_DEPLOYED = 40012001,
  MAX_COLLECTIONS_REACHED = 40012002,
  INVALID_ADDRESS_FOR_TRANSFER_TO = 40012003,
  TRANSACTION_FOR_TRANSFER_ALREADY_EXISTS = 40012004,
  //404
  COLLECTION_NOT_FOUND = 40412001,
  TRANSACTION_NOT_FOUNT = 40412002,
  //405
  METHOD_NOT_ALLOWED = 40512001,

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
  COLLECTION_METADATA_COLLECTION_ID_NOT_PRESENT = 42212007,
  COLLECTION_METADATA_SESSION_NOT_PRESENT = 42212008,
  COLLECTION_METADATA_IMAGES_SESSION_NOT_PRESENT = 42212009,
  COLLECTION_TYPE_NOT_PRESENT = 42212010,
  COLLECTION_TYPE_NOT_VALID = 42212011,
  CONTRACT_VERSION_NOT_PRESENT = 42212012,
  MINT_IDS_NOT_PRESENT = 42212013,
  MINT_IDS_LENGTH_NOT_VALID = 42212014,

  //500
  GENERAL_SERVER_ERROR = 50012000,
  CREATE_NEW_TRANSACTION_ERROR = 50012001,
  NFT_CONTRACT_OWNER_ERROR = 50012002,
  DEPLOY_NFT_CONTRACT_ERROR = 50012003,
  TRANSFER_NFT_CONTRACT_ERROR = 50012004,
  MINT_NFT_ERROR = 50012005,
  SET_NFT_BASE_URI_ERROR = 50012006,
  MINT_NFT_SUPPLY_ERROR = 50012007,
  MINT_NFT_RESERVE_ERROR = 50012008,
  NFT_COLLECTION_DOES_NOT_EXIST = 50012009,
  CREATE_BUCKET_FOR_NFT_METADATA_ERROR = 50012010,
  INVALID_DATA_PASSED_TO_WORKER = 50012011,
  BURN_NFT_ERROR = 50012012,
  COLLECTION_NOT_NESTABLE = 50012013,
  COLLECTION_PARENT_AND_CHILD_NFT_CHAIN_MISMATCH = 50012014,
  NEST_MINT_NFT_ERROR = 50012015,
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
  BURN_NFT = 5,
  NEST_MINT_NFT = 6,
}

export enum CollectionStatus {
  CREATED = 0,
  DEPLOY_INITIATED = 1,
  DEPLOYING = 2,
  DEPLOYED = 3,
  TRANSFERED = 4,
  FAILED = 5,
}
