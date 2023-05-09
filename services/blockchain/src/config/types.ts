import { EvmChain, SubstrateChain } from '@apillon/lib';

export type Chain = SubstrateChain | EvmChain;

export enum DbTables {
  WALLET = 'wallet',
  ENDPOINT = 'endpoint',
  TRANSACTION_QUEUE = 'transaction_queue',
}

export enum CrustTransferType {
  TRANSFER = 0,
  STORAGE_ORDER = 1,
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
 *  16 - BC       <----
 *  INTERNAL ERROR CODE: 000 - 999
 *
 **/
export enum BlockchainErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 42216000,
  INVALID_STATUS = 422164001,
  WALLET_INVALID_CHAIN = 422164002,
  WALLET_ADDRESS_NOT_PRESENT = 42216003,
  WALLET_SEED_NOT_PRESENT = 42216004,

  // 400 - Bad request
  BAD_REQUEST = 40016001,
  INVALID_CHAIN = 40016002,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40116100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40316100,

  // 404 - Not found
  API_KEY_NOT_FOUND = 40416001,
  TRANSACTION_NOT_FOUND = 40416002,

  // 405 - Method not allowed
  ONLY_FOR_LOCAL_DEV_AND_TEST = 40516001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50016001,
  ERROR_READING_FROM_DATABASE = 50016002,
  ERROR_GENERATING_TRANSACTION = 50016003,
  ERROR_TRANSMITING_TRANSACTION = 50016004,
  INVALID_DATA_PASSED_TO_WORKER = 50016005,
}

//#region SQL stuff - TODO: Should be streamlined? This is part of the SQL lib, not access
export enum SqlModelStatus {
  DRAFT = 1,
  INCOMPLETE = 2,
  ACTIVE = 5,
  DELETED = 9,
}

//#endregion
