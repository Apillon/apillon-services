import { EvmChain, SubstrateChain } from '@apillon/lib';
import {
  DidTransaction,
  TransferTransaction,
  AttestationTransaction,
} from '../modules/blockchain-indexers/substrate/kilt/data-models/kilt-transactions';

export type Chain = SubstrateChain | EvmChain;

export enum DbTables {
  WALLET = 'wallet',
  ENDPOINT = 'endpoint',
  TRANSACTION_QUEUE = 'transaction_queue',
  TRANSACTION_LOG = 'transaction_log',
  WALLET_DEPOSIT = 'wallet_deposit',
}

export enum CrustTransferType {
  TRANSFER = 0,
  STORAGE_ORDER = 1,
}

/**
 *  --- INDEXER DATA ---
 * TODO: Consider moving to separate types file indexer related things
 * NOTE: Do not change definitions unless you know what you are doing!!
 *       These are mappings from the SQUID INDEXER service
 **/
/* KILT PARACHAIN */
export enum KiltTransactionType {
  BALANCE_TRANSFER = 'balance-transfer',
  BALANCE_DEPOSIT = 'balance-deposit',
  BALANCE_WITHDRAW = 'balance-withdraw',
  BALANCE_RESERVED = 'balance-reserved',
  BALANCE_UNRESERVED = 'balance-unreserved',
  DID_CREATE = 'did-create',
  DID_DELETE = 'did-delete',
  DID_UPDATE = 'did-update',
  ATTESTATION_CREATE = 'attestation-create',
  ATTESTATION_REMOVE = 'attestation-remove',
  ATTESTATION_REVOKE = 'attestation-revoke',
  SYSTEM_EVENTS_SUCCESS = 'system-event-success',
  SYSTEM_EVENTS_FAIL = 'system-event-fail',
}

/* CRUST PARACHAIN */
export enum CrustTransactionType {
  BALANCE_TRANSFER = 'balances-transfer',
  MARKET_ORDER_FILE_SUCCESS = 'market-order-file-success',
  // Switched naming order. It's how Crust does it.
  MARKET_FILE_RENEW_SUCCESS = 'market-file-renew-success',
  SYSTEM_EVENTS_SUCCESS = 'system-event-success',
  SYSTEM_EVENTS_FAIL = 'system-event-fail',
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

  TRANSACTION_LOG_BLOCK_ID_NOT_PRESENT = 42214010,
  TRANSACTION_LOG_STATUS_NOT_PRESENT = 42214011,
  TRANSACTION_LOG_DIRECTION_NOT_PRESENT = 42214012,
  TRANSACTION_LOG_WALLET_NOT_PRESENT = 42214013,
  TRANSACTION_LOG_ACTION_NOT_PRESENT = 42214014,
  TRANSACTION_LOG_TOKEN_NOT_PRESENT = 42214015,
  TRANSACTION_LOG_AMOUNT_NOT_PRESENT = 42214016,
  TRANSACTION_LOG_CHAIN_NOT_PRESENT = 42214017,
  TRANSACTION_LOG_CHAIN_TYPE_NOT_PRESENT = 42214018,
  TRANSACTION_LOG_TX_HASH_NOT_PRESENT = 42214019,
  TRANSACTION_LOG_TIMESTAMP_NOT_PRESENT = 42214020,
  WALLET_DEPOSIT_TX_HASH_NOT_PRESENT = 42214021,
  WALLET_DEPOSIT_PURCHASE_AMOUNT_NOT_PRESENT = 42214022,
  WALLET_DEPOSIT_CURRENT_AMOUNT_NOT_PRESENT = 42214023,
  WALLET_DEPOSIT_WALLET_NOT_PRESENT = 42214023,

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
  WALLET_NOT_FOUND = 40416003,

  // 405 - Method not allowed
  ONLY_FOR_LOCAL_DEV_AND_TEST = 40516001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50016001,
  ERROR_READING_FROM_DATABASE = 50016002,
  ERROR_GENERATING_TRANSACTION = 50016003,
  ERROR_TRANSMITING_TRANSACTION = 50016004,
  INVALID_DATA_PASSED_TO_WORKER = 50016005,
  WALLET_DOES_NOT_EXISTS = 50016006,
}

export enum TxStatus {
  PENDING = 1,
  COMPLETED = 5,
  FAILED = 9,
}

export enum TxDirection {
  UNKNOWN = 0,
  INCOME = 1,
  COST = 2,
}

export enum TxToken {
  CRUST_TOKEN = 'CRU',
  KILT_TOKEN = 'KILT',
  MOONBASE_TOKEN = 'DEV',
  MOONBEAM_TOKEN = 'GLMR',
  PHALA_TOKEN = 'PHA',
  POLKADOT_TOKEN = 'DOT',
  ASTAR_TOKEN = 'ASTR',
  SHIBUYA_TOKEN = 'SBY',
  ETHEREUM = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
}

export enum TxAction {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSACTION = 'TRANSACTION',
  UNKNOWN = 'UNKNOWN',
}

export enum TransactionIndexerStatus {
  FAIL = 0,
  SUCCESS = 1,
}
