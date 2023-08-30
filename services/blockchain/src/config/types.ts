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
}

export enum CrustTransferType {
  TRANSFER = 0,
  STORAGE_ORDER = 1,
}

// NOTE: Do not change!! These are mappings from the SQUID KILT service
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

export type TransfersTransactions = {
  TRANSFER: TransferTransaction[];
  DEPOSIT: TransferTransaction[];
  WITHDRAWAL: TransferTransaction[];
  RESERVED_BALANCES: TransferTransaction[];
};

export type DidTransactions = {
  CREATE: DidTransaction[];
  DELETE: DidTransaction[];
  UPDATE: DidTransaction[];
};

export type AttestTransactions = {
  CREATE: AttestationTransaction[];
  REMOVE: AttestationTransaction[];
  REVOKE: AttestationTransaction[];
};

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
  STATUS_NOT_PRESENT = 422_16_000,
  INVALID_STATUS = 422_16_4001,
  WALLET_INVALID_CHAIN = 422_16_4002,
  WALLET_ADDRESS_NOT_PRESENT = 422_16_003,
  WALLET_SEED_NOT_PRESENT = 422_16_004,

  TRANSACTION_LOG_BLOCK_ID_NOT_PRESENT = 422_14_010,
  TRANSACTION_LOG_STATUS_NOT_PRESENT = 422_14_011,
  TRANSACTION_LOG_DIRECTION_NOT_PRESENT = 422_14_012,
  TRANSACTION_LOG_WALLET_NOT_PRESENT = 422_14_013,
  TRANSACTION_LOG_ACTION_NOT_PRESENT = 422_14_014,
  TRANSACTION_LOG_TOKEN_NOT_PRESENT = 422_14_015,
  TRANSACTION_LOG_AMOUNT_NOT_PRESENT = 422_14_016,
  TRANSACTION_LOG_CHAIN_NOT_PRESENT = 422_14_017,
  TRANSACTION_LOG_CHAIN_TYPE_NOT_PRESENT = 422_14_018,
  TRANSACTION_LOG_TX_HASH_NOT_PRESENT = 422_14_019,
  TRANSACTION_LOG_TIMESTAMP_NOT_PRESENT = 422_14_020,

  // 400 - Bad request
  BAD_REQUEST = 400_16_001,
  INVALID_CHAIN = 400_16_002,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 401_16_100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 403_16_100,

  // 404 - Not found
  API_KEY_NOT_FOUND = 404_16_001,
  TRANSACTION_NOT_FOUND = 404_16_002,
  WALLET_NOT_FOUND = 404_16_003,

  // 405 - Method not allowed
  ONLY_FOR_LOCAL_DEV_AND_TEST = 405_16_001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 500_16_001,
  ERROR_READING_FROM_DATABASE = 500_16_002,
  ERROR_GENERATING_TRANSACTION = 500_16_003,
  ERROR_TRANSMITING_TRANSACTION = 500_16_004,
  INVALID_DATA_PASSED_TO_WORKER = 500_16_005,
  WALLET_DOES_NOT_EXISTS = 500_16_006,
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
