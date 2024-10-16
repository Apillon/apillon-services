export enum DbTables {
  TRANSACTION = 'transaction',
}

export enum AssetManagementErrorCode {
  //400
  //404
  TRANSACTION_NOT_FOUND = 40422001,
  ENDPOINT_NOT_FOUND = 40422002,
  WALLET_NOT_FOUND = 40422003,
  MULTISIG_WALLET_NOT_FOUND = 40422004,
  //405
  METHOD_NOT_ALLOWED = 40522001,

  //422
  DATA_NOT_PRESENT = 42222001,
  DATA_NOT_VALID = 42222002,
  CHAIN_NOT_SUPPORTED = 42222003,

  //500
  GENERAL_SERVER_ERROR = 50022000,
  ERROR_CREATING_REFILL_TRANSACTION = 50022001,
  ERROR_CONFIRMING_MULTISIG_TRANSACTION = 5002202,
  ERROR_CANCELING_MULTISIG_TRANSACTION = 5002203,
  MULTISIG_TRANSACTION_ALREADY_CONFIRMED = 5002204,
  MULTISIG_OPERATION_ALREADY_OPEN = 5002205,
  MULTISIG_OPERATION_NOT_OPEN = 5002206,

  TOKEN_BALANCE_TOO_LOW = 50022100,
  WALLET_TOKEN_MISSING = 50022101,
  ASSET_NOT_SUPPORTED = 50022102,
  // 501
  ACTION_NOT_SUPPORTED = 50022108,
}

export enum TransactionType {
  SWAP_AND_TRANSFER = 1,
}
