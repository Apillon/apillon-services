export enum DbTables {
  TRANSACTION = 'transaction',
  CONTRACT = 'contract',
  CONTRACT_ABI = 'contract_abi',
  CLUSTER_WALLET = 'cluster_wallet',
  CLUSTER_TRANSACTION_LOG = 'cluster_transaction_log',
}

export enum ComputingErrorCode {
  //400
  CONTRACT_ALREADY_DEPLOYED = 40012001,
  MAX_CONTRACTS_REACHED = 40012002,
  INVALID_ADDRESS_FOR_TRANSFER_TO = 40012003,
  TRANSACTION_FOR_TRANSFER_ALREADY_EXISTS = 40012004,
  //404
  COLLECTION_NOT_FOUND = 40412001,
  TRANSACTION_NOT_FOUND = 40412002,
  BUCKET_NOT_FOUND = 40412003,
  //405
  METHOD_NOT_ALLOWED = 40512001,

  //422
  TRANSACTION_CHAIN_ID_NOT_PRESENT = 42212001,
  TRANSACTION_RAW_TRANSACTION_NOT_PRESENT = 42212002,
  TRANSACTION_NONCE_NOT_PRESENT = 42212003,
  TRANSACTION_TYPE_NOT_PRESENT = 42212004,
  CONTRACT_COLLECTION_UUID_NOT_PRESENT = 42212005,
  CONTRACT_PROJECT_UUID_NOT_PRESENT = 42212006,
  CONTRACT_NAME_NOT_PRESENT = 42212006,
  CONTRACT_TYPE_NOT_PRESENT = 42212010,
  CONTRACT_TYPE_NOT_VALID = 42212011,
  CONTRACT_DATA_NOT_VALID_JSON = 42212012,
  REQUIRED_DATA_NOT_PRESENT = 42212013,
  DATA_TYPE_INVALID = 42212014,
  FIELD_NOT_PRESENT = 42212015,

  //500
  GENERAL_SERVER_ERROR = 50012000,
  CREATE_NEW_TRANSACTION_ERROR = 50012001,
  CONTRACT_OWNER_ERROR = 50012002,
  DEPLOY_CONTRACT_ERROR = 50012003,
  TRANSFER_CONTRACT_ERROR = 50012004,
  CONTRACT_DOES_NOT_EXIST = 50012005,
  INVALID_DATA_PASSED_TO_WORKER = 50012006,
  DEPOSIT_TO_PHALA_CLUSTER_ERROR = 50012007,
  CONTRACT_ADDRESS_IS_MISSING = 50012008,
  CONTRACT_NOT_DEPLOYED = 50012009,
  CONTRACT_TRANSFERING_OR_ALREADY_TRANSFERED = 50012010,
  FAILED_TO_ENCRYPT_CONTENT = 50012011,
  FAILED_TO_ASSIGN_CID_TO_NFT = 50012012,
}

export enum TransactionType {
  DEPLOY_CONTRACT = 1,
  TRANSFER_CONTRACT_OWNERSHIP = 2,
  DEPOSIT_TO_CONTRACT_CLUSTER = 3,
  ASSIGN_CID_TO_NFT = 4,
}

export enum ContractStatus {
  CREATED = 0,
  DEPLOY_INITIATED = 1,
  DEPLOYING = 2, //INSTANTIATING
  DEPLOYED = 3, //INSTANTIATED
  TRANSFERRING = 4,
  TRANSFERRED = 5,
  FAILED = 6,
}

export enum TxDirection {
  UNKNOWN = 0,
  INCOME = 1,
  COST = 2,
}

export enum TxAction {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSACTION = 'TRANSACTION',
  UNKNOWN = 'UNKNOWN',
}

export enum ComputingTransactionStatus {
  PENDING = 1,
  CONFIRMED = 2,
  FAILED = 3,
  ERROR = 4,
  WORKER_SUCCESS = 5,
  WORKER_FAILED = 6,
}
