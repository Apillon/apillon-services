export enum ChainType {
  SUBSTRATE = 1,
  EVM = 2,
}

export enum TransactionStatus {
  PENDING = 1,
  CONFIRMED = 2,
  FAILED = 3,
  ERROR = 4,
}

export enum SubstrateChain {
  CRUST = 1,
  KILT = 2,
  PHALA = 4,
}

export enum EvmChain {
  MOONBEAM = 1284,
  MOONBASE = 1287,
  ASTAR_SHIBUYA = 81, // testnet
  ASTAR = 592,
}

export enum NFTCollectionType {
  GENERIC = 1,
  NESTABLE = 2,
}

export enum AmsEventType {
  USER_REGISTER = 'user-register',
  USER_GET_AUTH = 'user-get-auth',
  USER_LOGIN = 'user-login',
  USER_LOGOUT = 'user-logout',
  USER_LOGIN_KILT = 'user-login-kilt',
  USER_WALLET_LOGIN = 'user-wallet-login',
  USER_UPDATE = 'user-update',
  USER_PASSWORD_RESET = 'user-password-reset',
  USER_ROLE_ASSIGN = 'user-role-assign',
  USER_ROLE_REMOVE = 'user-role-remove',
  USER_GET_LOGINS = 'user-get-logins',
  USER_GET_ROLES = 'user-get-roles',
  USER_SET_STATUS = 'user-set-status',
  AUTH_TOKEN_CREATE_UPDATE_TOKEN = 'auth-token-create-update-token',
  USER_EMAIL_EXISTS = 'user-email-exists',
  GET_AUTH_USER_BY_EMAIL = 'get-auth-user-by-email',
  CREATE_API_KEY = 'create-api-key',
  DELETE_API_KEY = 'delete-api-key',
  LIST_API_KEYS = 'list-api-keys',
  API_KEY_ROLE_ASSIGN = 'api-key-role-assign',
  API_KEY_ROLE_REMOVE = 'api-key-role-remove',
  GET_API_KEY_ROLES = 'get-api-key-roles',
  GET_API_KEY = 'get-api-key',
  API_KEYS_IN_PROJECT_UPDATE = 'update-api-keys-in-project',
  DISCORD_LINK = 'discord-link',
  DISCORD_UNLINK = 'discord-unlink',
  DISCORD_USER_LIST = 'discord-user-list',
  GET_OAUTH_LINKS = 'get-oauth-links',
}

export enum LmasEventType {
  WRITE_LOG = 'write-log',
  WRITE_REQUEST_LOG = 'write-request-log',
  SEND_ALERT = 'send-alert',
  SEND_ADMIN_ALERT = 'send-admin-alert',
  NOTIFY = 'notify',
  LIST_LOGS = 'list-logs',
  LIST_REQUEST_LOGS = 'list-request-logs',
  GET_API_KEYS_USAGE_COUNT = 'get-api-keys-usage-count',
}

export enum BlockchainEventType {
  SUBSTRATE_SIGN_TRANSACTION = 'substrate-sign-transaction',
  SUBSTRATE_GET_TRANSACTION = 'substrate-get-transaction',
  EVM_SIGN_TRANSACTION = 'evm-sign-transaction',
  EVM_GET_TRANSACTION = 'evm-get-transaction',
  GET_CHAIN_ENDPOINT = 'get-chain-endpoint',
  LIST_WALLETS = 'list-wallets',
  GET_WALLET = 'get-wallet',
  UPDATE_WALLET = 'update-wallet',
  GET_WALLET_TRANSACTIONS = 'get-wallet-transactions',
  UPDATE_TRANSACTION = 'update-transaction',
}

export enum StorageEventType {
  REQUEST_S3_SIGNED_URLS_FOR_UPLOAD = 'request-s3-signed-urls-for-upload',
  REQUEST_S3_SIGNED_URLS_FOR_WEBSITE_UPLOAD = 'request-s3-signed-urls-for-website-upload',
  END_FILE_UPLOAD_SESSION = 'end-file-upload-session',
  END_FILE_UPLOAD = 'end-file-upload',
  CREATE_BUCKET = 'create-bucket',
  UPDATE_BUCKET = 'update-bucket',
  DELETE_BUCKET = 'delete-bucket',
  CANCEL_DELETE_BUCKET = 'delete-bucket-cancel',
  GET_BUCKET = 'get-bucket',
  LIST_BUCKETS = 'list-buckets',
  LIST_BUCKET_CONTENT = 'list-bucket-content',
  CREATE_DIRECTORY = 'create-directory',
  UPDATE_DIRECTROY = 'update-directory',
  DELETE_DIRECTORY = 'delete-directory',
  CANCEL_DELETE_DIRECTORY = 'cancel-delete-directory',
  LIST_DIRECTORY_CONTENT = 'list-directory-content',
  GET_FILE_DETAILS = 'get-file-details',
  FILE_DELETE = 'delete-file',
  CANCEL_FILE_DELETE = 'cancel-delete-file',
  BUCKET_WEBHOOK_GET = 'get-bucket-webhook',
  BUCKET_WEBHOOK_CREATE = 'create-bucket-webhook',
  BUCKET_WEBHOOK_UPDATE = 'update-bucket-webhook',
  BUCKET_WEBHOOK_DELETE = 'delete-bucket-webhook',
  LIST_FILE_UPLOAD = 'list-file-upload',
  MAX_BUCKETS_QUOTA_REACHED = 'max-buckets-quota-reached',
  LIST_FILES_MARKED_FOR_DELETION = 'list-files-marked-for-deletion',
  IPNS_LIST = 'list-ipns',
  IPNS_CREATE = 'create-ipns',
  IPNS_UPDATE = 'update-ipns',
  IPNS_DELETE = 'delete-ipns',
  IPNS_PUBLISH = 'publish-ipns',
  IPNS_GET = 'get-ipns',
  WEBSITE_LIST = 'list-websites',
  WEBSITE_CREATE = 'create-website',
  WEBSITE_UPDATE = 'update-website',
  WEBSITE_GET = 'get-website',
  WEBSITE_DEPLOY = 'deploy-website',
  WEBSITE_LIST_DOMAINS = 'list-website-domains',
  WEBSITE_QUOTA_REACHED = 'websites-quota-reached',
  BUCKET_CLEAR_CONTENT = 'clear-bucket-content',
  DEPLOYMENT_GET = 'get-deployment',
  DEPLOYMENT_LIST = 'list-deployment',
  EXECUTE_PREPARE_COLLECTION_BASE_URI_WORKER = 'execute-prepare-collection-base-uri-worker',
  TEST_CRUST_PROVIDER = 'test-crust-provider',
  PROJECT_STORAGE_DETAILS = 'project-storage-details',
}

export enum AuthenticationEventType {
  IDENTITY_VERIFICATION = 'identity-verification',
  SEND_VERIFICATION_EMAIL = 'send-verification-email',
  GET_IDENTITY_GEN_PROCESS_STATE = 'get-identity-gen-process-state',
  GENERATE_IDENTITY = 'generate-identity',
  GET_IDENTITY_USER_CREDENTIAL = 'get-identity-user-credential',
  REVOKE_IDENTITY = 'revoke-identity',
  GENERATE_DEV_RESOURCES = 'generate-dev-resources',
  SPORRAN_GET_SESSION_VALUES = 'sporran-get-session-values',
  SPORRAN_VERIFY_SESSION = 'sporran-verify-session',
  SPORRAN_SUBMIT_TERMS = 'sporran-submit-terms',
  SPORRAN_SUBMIT_ATTESTATION = 'sporran-submit-attestation',
  SPORRAN_REQUEST_CREDENTIAL = 'sporran-request-credential',
  SPORRAN_VERIFY_CREDENTIAL = 'sporran-verify-credential',
}

export enum MailEventType {
  SEND_MAIL = 'send-mail',
  SEND_CUSTOM_MAIL = 'send-custom-mail',
}

export enum ScsEventType {
  GET_QUOTA = 'get-quota',
  GET_ALL_QUOTAS = 'get-all-quotas',
  GET_ACTIVE_TERMS = 'get-active-terms',
  CREATE_OVERRIDE = 'create-override',
  DELETE_OVERRIDE = 'delete-override',
}

export enum NftsEventType {
  HELLO = 'hello',
  CREATE_COLLECTION = 'create-collection',
  NFT_COLLECTIONS_LIST = 'list-nft-collections',
  GET_NFT_COLLECTION = 'get-nft-collection',
  GET_NFT_COLLECTION_BY_UUID = 'get-nft-collection-by-uuid',
  TRANSFER_OWNERSHIP = 'transfer-ownership',
  MINT_NFT = 'mint-nft',
  NEST_MINT_NFT = 'nest-mint-nft',
  SET_BASE_URI = 'set-base-uri',
  CHECK_TRANSACTION_STATUS = 'check-transaction-status',
  NFT_COLLECTION_TRANSACTION_LIST = 'list-collection-transactions',
  DEPLOY_COLLECTION = 'deploy-collection',
  BURN_NFT = 'burn-nft',
  MAX_COLLECTIONS_QUOTA_REACHED = 'max-collections-quota-reached',
  EXECUTE_DEPLOY_COLLECTION_WORKER = 'execute-deploy-collection-worker',
  PROJECT_COLLECTION_DETAILS = 'project-collections-details',
}

export enum ReferralEventType {
  CREATE_PLAYER = 'create-referral',
  GET_PLAYER = 'get-referral',
  GET_PRODUCTS = 'get-products',
  ORDER_PRODUCT = 'order-product',
  CONNECT_GITHUB = 'connect-githhub',
  DISCONNECT_GITHUB = 'disconnect-githhub',
  CONNECT_TWITTER = 'connect-twitter',
  DISCONNECT_TWITTER = 'disconnect-twitter',
  GET_TWITTER_LINK = 'get-twitter-link',
  GET_TWEETS = 'get-tweets',
  CONFIRM_RETWEET = 'confirm-retweet',
}

export enum ServiceName {
  GENERAL = 'GENERAL',
  AMS = 'AMS',
  LMAS = 'LMAS',
  DEV_CONSOLE = 'DEV_CONSOLE',
  MAIL = 'MAIL',
  STORAGE = 'STORAGE',
  APILLON_API = 'APILLON_API',
  AUTHENTICATION_API = 'AUTHENTICATION_API',
  NFTS = 'NFTS',
  REFERRAL = 'REFERRAL',
  BLOCKCHAIN = 'BLOCKCHAIN',
}

export enum ServiceCode {
  GENERAL = '00',
  LIB = '01',
  AMS = '02',
  LMAS = '03',
  DEV_CONSOLE = '04',
  APILLON_API = '05',
  STORAGE = '06',
  MOD_LIB = '07',
  MAIL = '08',
  AUTH = '09',
  CONFIG = '10',
  REFERRAL = '11',
  NFTS = '12',
  BLOCKCHAIN = '13',
}

export enum AppEnvironment {
  LOCAL_DEV = 'local',
  TEST = 'test',
  DEV = 'development',
  STG = 'staging',
  PROD = 'production',
}

export enum LogType {
  DB = 'DB',
  INFO = 'INFO',
  MSG = 'MSG',
  WARN = 'WARNING',
  ERROR = 'ERROR',
  COST = 'COST',
  ALERT = 'ALERT',
}

export enum LogLevel {
  DB_ONLY = 'db',
  NO_DB = 'no-db',
  DEBUG = 'debug',
  WARN = 'warning',
  ERROR_ONLY = 'error',
}

export enum SqlModelStatus {
  DRAFT = 1,
  INCOMPLETE = 2,
  INACTIVE = 3,
  ACTIVE = 5,
  BLOCKED = 7,
  MARKED_FOR_DELETION = 8,
  DELETED = 9,
}

/**
 * Types of services in dev-console-api
 */
export enum AttachedServiceType {
  AUTHENTICATION = 1,
  STORAGE = 2,
  NFT = 3,
  HOSTING = 4,
  SYSTEM = 999,
}

/**
 * Model population strategies.
 */
export enum PopulateFrom {
  PROFILE = 'profile',
  DB = 'db',
  DUPLICATE = 'duplicate',
  ADMIN = 'admin',
  WORKER = 'worker',
  AUTH = 'auth',
  SERVICE = 'service',
}

/**
 * Model serialization strategies.
 */
export enum SerializeFor {
  PROFILE = 'profile',
  INSERT_DB = 'insert_db',
  UPDATE_DB = 'update_db',
  SELECT_DB = 'select_db',
  ADMIN = 'admin',
  WORKER = 'worker',
  SERVICE = 'service',
  APILLON_API = 'apillon_api',
  LOGGER = 'logger',
}

/**
 * DTO validation strategies.
 */
export enum ValidateFor {
  BODY = 'body',
  QUERY = 'query',
}

//#region Roles & Permissions

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
}

export enum PermissionLevel {
  NONE = 0,
  OWN = 1,
  ALL = 2,
}

export enum DefaultUserRole {
  // values should not overlap with api key roles!!!

  // Admin roles
  ADMIN = 1, // System's admin
  SUPPORT = 2, // System Support user
  ANALYTIC = 3, // Read only system user
  // project roles
  PROJECT_OWNER = 10, // Owner of current project
  PROJECT_ADMIN = 11, // Admin of current project
  PROJECT_USER = 12, // (read only) User on current project
  // auth user roles
  INTERNAL_TEST_USER = 90, //user with access to new unpublished features
  EXTERNAL_TEST_USER = 91, //user with access to features ready for external testers
  BETA_USER = 92, //user with access to closed beta features
  USER = 99, // user with access to platform (published features)
}

export enum DefaultApiKeyRole {
  // values should not overlap with user roles!!!
  KEY_EXECUTE = 50,
  KEY_WRITE = 51,
  KEY_READ = 52,
}

export enum DefaultPermission {
  STORAGE = 1,
  HOSTING = 2,
  NFTS = 3,
  AUTHENTICATION = 4,
  COMPUTING = 5,
}

//#endregion

//#region Codes

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 * HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
 * MODULE CODE:
 *  00 - general
 *  01 - at-lib
 *  02 - ams
 *  03 - lmas
 *  04 - dev-api
 *  05 - apillon-api
 *  06 - storage
 *  07 - authentication-api
 *  ...
 *  INTERNAL ERROR CODE: 000 - 999
 *
 **/
export enum ErrorCode {
  STATUS_NOT_PRESENT = 422_00_100,
  INVALID_STATUS = 422_00_101,
  ERROR_WRITING_TO_DATABASE = 500_00_001,
  ERROR_READING_FROM_DATABASE = 500_00_002,
  SERVICE_ERROR = 500_00_100,
}

export enum ErrorOrigin {
  CORE_API = 'API',
  AUTH_SERVICE = 'AUTH',
}

/**
 * System Error codes - 500000.
 */
export enum SystemErrorCode {
  DEFAULT_SYSTEM_ERROR = 500000,
  UNHANDLED_SYSTEM_ERROR = 500001,
  SQL_SYSTEM_ERROR = 500002,
  AWS_SYSTEM_ERROR = 500003,
  MICROSERVICE_SYSTEM_ERROR = 500004,
}

/**
 * Bad request error codes - 400000.
 */
export enum BadRequestErrorCode {
  BAD_REQUEST = 400_00_000,
  INVALID_PATH = 400_00_001,
  INVALID_QUERY_PARAMETERS = 400_00_002,
  MISSING_AUTHORIZATION_HEADER = 400_00_003,
  INVALID_AUTHORIZATION_HEADER = 400_00_004,
  THIRD_PARTY_SERVICE_CONNECTION_FAILED = 400_00_005,
  RESOURCE_DOES_NOT_EXISTS = 400_00_006,
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATOR_ERROR_CODE = 422_00_000,
  BUCKET_PROJECT_UUID_NOT_PRESENT = 422_00_001,
  BUCKET_STORAGE_PLAN_ID_NOT_PRESENT = 422_00_002,
  BUCKET_NAME_NOT_PRESENT = 422_00_003,
  DIRECTORY_BUCKET_ID_NOT_PRESENT = 422_00_004,
  DIRECTORY_NAME_NOT_PRESENT = 422_00_005,
  BUCKET_UUID_NOT_PRESENT = 422_00_006,
  PATH_NOT_PRESENT = 422_00_007,
  FILE_NAME_NOT_PRESENT = 422_00_008,
  FILE_CONTENT_TYPE_NOT_PRESENT = 422_00_009,
  SESSION_UUID_NOT_PRESENT = 422_00_010,
  BUCKET_TYPE_NOT_PRESENT = 422_00_011,
  CREATE_API_KEY_PROJECT_UUID_NOT_PRESENT = 422_00_012,
  PROJECT_UUID_QUERY_PARAM_NOT_PRESENT = 422_00_013,
  API_KEY_ROLE_API_KEY_ID_NOT_PRESENT = 422_00_014,
  API_KEY_ROLE_ROLE_ID_NOT_PRESENT = 422_00_015,
  API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT = 422_00_016,
  API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT = 422_00_017,
  API_KEY_ROLE_ROLE_ID_NOT_VALID = 422_00_018,
  BUCKET_WEBHOOK_BUCKET_ID_NOT_PRESENT = 422_00_019,
  BUCKET_WEBHOOK_URL_NOT_PRESENT = 422_00_020,
  QUOTA_ID_NOT_PRESENT = 422_00_021,
  PROJECT_UUID_NOT_PRESENT_IN_QUERY = 422_00_022,
  BUCKET_TYPE_NOT_PRESENT_IN_QUERY = 422_00_023,
  IPNS_PROJECT_UUID_NOT_PRESENT = 422_00_024,
  IPNS_BUCKET_ID_NOT_PRESENT = 422_00_025,
  IPNS_NAME_NOT_PRESENT = 422_00_026,
  IPNS_IPNS_NAME_NOT_PRESENT = 422_00_027,
  IPNS_IPNS_VALUE_NOT_PRESENT = 422_00_028,
  PUBLISH_IPNS_IPNS_ID_NOT_PRESENT = 422_00_029,
  PUBLISH_IPNS_CID_NOT_PRESENT = 422_00_030,
  TASK_ID_NOT_PRESENT = 422_00_031,
  USER_OAUTH_TOKEN_NOT_PRESENT = 422_00_032,
  USER_OAUTH_VERIFIER_NOT_PRESENT = 422_00_033,
  TWEET_ID_NOT_PRESENT = 422_00_034,
  PRODUCT_ID_NOT_PRESENT = 422_00_035,
  WEBSITE_PROJECT_UUID_NOT_PRESENT = 422_00_036,
  WEBSITE_NAME_NOT_PRESENT = 422_00_037,
  DEPLOY_WEBSITE_ID_NOT_PRESENT = 422_00_038,
  DEPLOY_ENVIRONMENT_NOT_PRESENT = 422_00_039,
  FILES_PROPERTY_NOT_PRESENT = 422_00_040,
  FILES_PROPERTY_EMPTY = 422_00_041,
  PREPARE_AND_DEPLOY_COLLECTION_IMAGE_SESSION_NOT_PRESENT = 422_00_042,
  PREPARE_AND_DEPLOY_COLLECTION_METADATA_SESSION_NOT_PRESENT = 422_00_043,
  USER_WALLET_ADDRESS_NOT_PRESENT = 422_00_050,
  USER_AUTH_SIGNATURE_NOT_PRESENT = 422_00_051,
  USER_AUTH_TIMESTAMP_NOT_PRESENT = 422_00_052,
  NFT_DEPLOY_SYMBOL_NOT_PRESENT = 422_00_100,
  NFT_DEPLOY_SYMBOL_NOT_VALID = 422_00_101,
  NFT_DEPLOY_NAME_NOT_PRESENT = 422_00_102,
  NFT_DEPLOY_NAME_NOT_VALID = 422_00_103,
  NFT_DEPLOY_MAX_SUPPLY_NOT_PRESENT = 422_00_104,
  NFT_DEPLOY_MAX_SUPPLY_NOT_VALID = 422_00_105,
  NFT_DEPLOY_MINT_PRICE_NOT_PRESENT = 422_00_106,
  NFT_DEPLOY_MINT_PRICE_NOT_VALID = 422_00_107,
  NFT_DEPLOY_BASE_URI_NOT_PRESENT = 422_00_108,
  NFT_DEPLOY_BASE_URI_NOT_VALID = 422_00_109,
  NFT_DEPLOY_BASE_EXTENSION_NOT_PRESENT = 422_00_110,
  NFT_DEPLOY_BASE_EXTENSION_NOT_VALID = 422_00_111,
  NFT_DEPLOY_DROP_BOOL_NOT_PRESENT = 422_00_112,
  NFT_DEPLOY_DROP_TIMESTAMP_NOT_PRESENT = 422_00_113,
  NFT_DEPLOY_RESERVE_NOT_PRESENT = 422_00_114,
  NFT_DEPLOY_COLLECTION_DESCRIPTION_NOT_VALID = 422_00_115,
  NFT_DEPLOY_PROJECT_UUID_NOT_PRESENT = 422_00_116,
  NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_PRESENT = 422_00_117,
  NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_VALID = 422_00_118,
  NFT_TRANSFER_OWNERSHIP_COLLECTION_UUID_NOT_PRESENT = 422_00_119,
  NFT_MINT_ADDRESS_NOT_PRESENT = 422_00_120,
  NFT_MINT_ADDRESS_NOT_VALID = 422_00_121,
  NFT_MINT_QUANTITY_NOT_PRESENT = 422_00_122,
  NFT_MINT_QUANTITY_NOT_VALID = 422_00_123,
  NFT_MINT_COLLECTION_UUID_NOT_PRESENT = 422_00_124,
  NFT_SET_BASE_URI_NOT_PRESENT = 422_00_125,
  NFT_SET_BASE_URI_NOT_VALID = 422_00_126,
  NFT_SET_BASE_URI_COLLECTION_UUID_NOT_PRESENT = 422_00_127,
  NFT_PROJECT_UUID_QUERY_PARAM_NOT_PRESENT = 422_00_128,
  NFT_COLLECTION_UUI_PARAM_NOT_PRESENT = 422_00_129,
  NFT_COLLECTION_CHAIN_NOT_VALID = 422_00_130,
  NFT_COLLECTION_CHAIN_NOT_PRESENT = 422_00_131,
  NFT_COLLECTION_SOULBOUND_NOT_PRESENT = 422_00_132,
  NFT_COLLECTION_REVOKABLE_NOT_PRESENT = 422_00_133,
  NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_PRESENT = 422_00_134,
  NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_VALID = 422_00_135,
  NFT_COLLECTION_ROYALTIES_FEES_NOT_PRESENT = 422_00_136,
  NFT_COLLECTION_ROYALTIES_FEES_NOT_VALID = 422_00_137,
  TRANSACTION_REF_TABLE_PARAM_NOT_PRESENT = 422_00_138,
  TRANSACTION_REF_ID_PARAM_NOT_PRESENT = 422_00_139,
  NFT_COLLECTION_BASE_URI_NOT_PRESENT = 422_00_140,
  NFT_COLLECTION_TYPE_NOT_PRESENT = 422_00_141,
  NFT_COLLECTION_TYPE_NOT_VALID = 422_00_142,
  NFT_MINT_PARENT_COLLECTION_ID_NOT_PRESENT = 422_00_143,
  NFT_MINT_PARENT_NFT_ID_NOT_PRESENT = 422_00_144,
  NFT_DEPLOY_DROP_RESERVE_NOT_VALID = 422_00_145,
  NFT_DEPLOY_DROP_RESERVE_GREATER_THAN_MAX_SUPPLY = 422_00_146,
  NFT_BURN_TOKEN_ID_NOT_PRESENT = 422_00_147,
  NFT_BURN_TOKEN_ID_NOT_VALID = 422_00_148,
  QUOTA_CODE_NOT_VALID = 422_00_149,

  //#region Authentication
  USER_EMAIL_ALREADY_TAKEN = 422_00_701,
  USER_EMAIL_NOT_PRESENT = 422_00_702,
  USER_EMAIL_NOT_VALID = 422_00_703,
  VERIFICATION_IDENTITY_NOT_PRESENT = 422_00_704,
  IDENTITY_TOKEN_NOT_PRESENT = 422_00_705,
  IDENTITY_CAPTCHA_NOT_PRESENT = 422_00_706,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 422_00_707,
  IDENTITY_CREATE_INVALID_REQUEST = 422_00_708,
  IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT = 422_00_709,
  IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT = 422_00_710,
  DID_URI_NOT_PRESENT = 422_00_711,
  DID_URI_INVALID = 422_00_712,
  SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT = 422_00_713,
  SPORRAN_SESSIONID_NOT_PRESENT = 422_00_714,
  SPORRAN_REQUEST_MESSAGE_NOT_PRESENT = 422_00_715,
  SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT = 422_00_716,
  SPORRAN_NONCE_NOT_PRESENT = 422_00_717,
  AUTH_SESSION_TOKEN_NOT_PRESENT = 422_00_718,
  //#endregion

  //#region Blockchain
  SUBSTRATE_TRANSACTION_NOT_PRESENT = 422_00_801,
  SUBSTRATE_CHAIN_NOT_PRESENT = 422_00_802,
  SUBSTRATE_CHAIN_NOT_VALID = 422_00_803,
  EVM_TRANSACTION_NOT_PRESENT = 422_00_804,
  EVM_CHAIN_NOT_PRESENT = 422_00_805,
  EVM_CHAIN_NOT_VALID = 422_00_806,
  //#endregion

  //#region Caching
  INVALID_CACHE_KEY = 422_00_900,
  //#endregion

  //#region Logs
  INVALID_LOG_TYPE = 422_00_901,
  INVALID_SERVICE_NAME = 422_00_902,
  COLLECTION_NAME_NOT_PRESENT = 422_00_903,
  COLLECTION_NAME_NOT_VALID = 422_00_904,
  //#endregion
}

/**
 * Unauthorized error codes - 401000.
 */
export enum UnauthorizedErrorCodes {
  UNAUTHORIZED = 401_00_000,
  INVALID_TOKEN = 401_00_001,
  INVALID_SIGNATURE = 401_00_002,
}

export enum ForbiddenErrorCodes {
  FORBIDDEN = 403_00_000,
}

//#endregion

//#region Roles

export enum RoleType {
  USER_ROLE = 1,
  API_KEY_ROLE = 2,
}

/**
 * Groups of roles used for Permissions decorators in controllers
 */
export class RoleGroup {
  static ProjectAccess = [
    DefaultUserRole.PROJECT_OWNER,
    DefaultUserRole.PROJECT_ADMIN,
    DefaultUserRole.PROJECT_USER,
    DefaultUserRole.ADMIN,
  ];
}

//#endregion

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  USER_AUTHENTICATION = 'user-authentication',
  USER_RESET_PASSWORD = 'user-reset-password',
  USER_RESET_EMAIL = 'user-reset-email',
  USER_CONFIRM_EMAIL = 'user-confirm-email',
}

/**
 * Quota codes
 * Must equal quota.id field in database!
 */
export enum QuotaCode {
  MAX_PROJECT_COUNT = 1,
  MAX_USERS_ON_PROJECT = 2,
  MAX_API_KEYS = 3,
  MAX_HOSTING_BUCKETS = 4,
  MAX_FILE_BUCKETS = 5,
  MAX_BUCKET_SIZE = 6,
  MAX_ATTESTED_USERS = 7,
  MAX_WEBSITES = 8,
  MAX_NFT_COLLECTIONS = 9,
}

/**
 * Quota types
 * Must equal quota.type field in database!
 */
export enum QuotaType {
  FOR_OBJECT = 1,
  FOR_PROJECT = 2,
  FOR_PROJECT_AND_OBJECT = 3,
}

/* OAuth link type*/
export enum OauthLinkType {
  DISCORD = 1,
  TWEETER = 2,
  GITHUB = 3,
}

export enum CacheKeyPrefix {
  BUCKET_LIST = 'bucket-list',
  ADMIN_USER_LIST = 'admin-user-list',
  ADMIN_PROJECT_LIST = 'admin-project-list',
}

export enum CacheKeyTTL {
  EXTRA_SHORT = 10, // 10 s
  SHORT = 60, // 1 min
  DEFAULT = 5 * 60, // 5 min
  EXTENDED = 10 * 60, // 10 min
  LONG = 30 * 60, // 30 min
  EXTRA_LONG = 60 * 60, // 60 min
}

export enum MongoCollections {
  ALERT = 'alert',
  ADMIN_ALERT = 'admin-alert',
  LOGS = 'logs',
  REQUEST_LOGS = 'request_logs',
  API_REQUEST_LOGS = 'api_request_logs',
}

export enum ApiName {
  ADMIN_CONSOLE_API = 'admin-console-api',
  DEV_CONSOLE_API = 'dev-console-api',
  APILLON_API = 'apillon-api',
  AUTHENTICATION_API = 'authentication-api',
}
