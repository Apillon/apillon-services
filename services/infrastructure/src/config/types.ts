export enum DbTables {
  RPC_API_KEY = 'rpc_api_key',
  RPC_URL = 'rpc_url',
  DWELLIR_USER = 'dwellir_user',
  INDEXER = 'indexer',
  INDEXER_DEPLOYMENT = 'indexer_deployment',
}

export enum InfrastructureErrorCode {
  // 400 - Bad Request
  MAX_RPC_KEYS_REACHED = 40020001,
  PROJECT_HAS_NO_SUBSCRIPTION = 40020002,

  INDEXER_SOURCE_CODE_INVALID_FORMAT = 40020100,
  INDEXER_SOURCE_CODE_NOT_FOUND = 40020101,
  INDEXER_IS_NOT_DEPLOYED = 40020102,
  // 422 - Unprocessable Entity
  RPC_API_KEY_NAME_NOT_PRESENT = 42220001,
  RPC_API_KEY_API_KEY_NOT_PRESENT = 42220002,
  RPC_API_KEY_PROJECT_UUID_NOT_PRESENT = 42220003,
  RPC_URL_NAME_NOT_PRESENT = 42220004,
  RPC_URL_CHAIN_NAME_NOT_PRESENT = 42220005,
  RPC_URL_NETWORK_NOT_PRESENT = 42220006,
  RPC_URL_HTTPS_URL_NOT_PRESENT = 42220007,
  RPC_URL_WSS_URL_NOT_PRESENT = 42220008,
  RPC_URL_API_KEY_ID_NOT_PRESENT = 42220009,
  RPC_URL_CHAIN_NOT_FOUND = 42220010,
  RPC_URL_NETWORK_NOT_FOUND = 42220011,
  RPC_URL_URLS_NOT_PRESENT = 42220012,
  RPC_API_KEY_USAGE_NOT_FOUND = 42220013,

  INDEXER_REQUIRED_DATA_NOT_PRESENT = 42220100,
  INDEXER_DEPLOY_REQUIRED_DATA_NOT_PRESENT = 42220101,

  // 401 - Unauthorized
  USER_IS_NOT_AUTHORIZED = 40120001,

  // 404 - Not Found
  RPC_API_KEY_NOT_FOUND = 40420001,
  RPC_URL_NOT_FOUND = 40420002,
  DWELLIR_ID_NOT_FOUND = 40420003,

  INDEXER_DEPLOYMENT_NOT_FOUND = 40420200,
  INDEXER_NOT_FOUND = 40420201,

  // 500
  ERROR_CALLING_SQD_API = 50020001,
}
