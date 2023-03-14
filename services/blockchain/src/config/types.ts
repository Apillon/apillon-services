export enum DbTables {
  WALLET = 'wallet',
  ENDPOINT = 'endpoint',
  TRANSACTION_QUEUE = 'transaction_queue',
}

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 * HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
 * MODULE CODE:
 *  00 - general
 *  01 - @apillon/lib
 *  02 - AMS
 *  03 - lmas
 *  04 - dev-api
 *  ...
 *  11 - BC       <----
 *  INTERNAL ERROR CODE: 000 - 999
 *
 **/
export enum BlockchainErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 42213000,
  INVALID_STATUS = 422134001,
  WALLET_INVALID_CHAIN = 422134002,
  WALLET_ADDRESS_NOT_PRESENT = 42213003,
  WALLET_SEED_NOT_PRESENT = 42213004,

  // 400 - Bad request
  BAD_REQUEST = 40013001,
  USER_DOES_NOT_EXISTS = 40013100,
  USER_ALREADY_REGISTERED = 40013101,
  USER_AUTH_TOKEN_NOT_EXISTS = 40013220,
  USER_AUTH_TOKEN_IS_INVALID = 40013201,
  MAX_API_KEY_QUOTA_REACHED = 40013300,
  INVALID_API_KEY = 40112400,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40113100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40313100,

  // 404 - Not found
  API_KEY_NOT_FOUND = 40413001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50013001,
  ERROR_READING_FROM_DATABASE = 50013002,
  ERROR_GENERATING_TRANSACTION = 50013003,
}

//#region SQL stuff - TODO: Should be streamlined? This is part of the SQL lib, not access
export enum SqlModelStatus {
  DRAFT = 1,
  INCOMPLETE = 2,
  ACTIVE = 5,
  DELETED = 9,
}

//#endregion
