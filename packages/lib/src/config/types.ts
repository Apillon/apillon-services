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
  KILT_SPIRITNET = 3,
  PHALA = 4,
}

export enum EvmChain {
  MOONBEAM = 1284,
  MOONBASE = 1287,
  ASTAR_SHIBUYA = 81, // testnet
  ASTAR = 592,
}

export enum AmsEventType {
  USER_REGISTER = 'user-register',
  USER_GET_AUTH = 'user-get-auth',
  USER_LOGIN = 'user-login',
  USER_LOGIN_KILT = 'user-login-kilt',
  USER_WALLET_LOGIN = 'user-wallet-login',
  USER_UPDATE = 'user-update',
  USER_PASSWORD_RESET = 'user-password-reset',
  USER_ROLE_ASSIGN = 'user-role-assign',
  USER_ROLE_REMOVE = 'user-role-remove',
  USER_GET_LOGINS = 'user-get-logins',
  USER_GET_ROLES = 'user-get-roles',
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
  SET_BASE_URI = 'set-base-uri',
  CHECK_TRANSACTION_STATUS = 'check-transaction-status',
  NFT_COLLECTION_TRANSACTION_LIST = 'list-collection-transactions',
  DEPLOY_COLLECTION = 'deploy-collection',
  BURN_NFT = 'burn-nft',
  MAX_COLLECTIONS_QUOTA_REACHED = 'max-collections-quota-reached',
  EXECUTE_DEPLOY_COLLECTION_WORKER = 'execute-deploy-collection-worker',
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
  ACTIVE = 5,
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
  STATUS_NOT_PRESENT = 42200100,
  INVALID_STATUS = 42200101,
  ERROR_WRITING_TO_DATABASE = 50000001,
  ERROR_READING_FROM_DATABASE = 50000002,
  SERVICE_ERROR = 50000100,
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
  BAD_REQUEST = 40000000,
  INVALID_PATH = 40000001,
  INVALID_QUERY_PARAMETERS = 40000002,
  MISSING_AUTHORIZATION_HEADER = 40000003,
  INVALID_AUTHORIZATION_HEADER = 40000004,
  THIRD_PARTY_SERVICE_CONNECTION_FAILED = 40000005,
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATOR_ERROR_CODE = 42200000,
  BUCKET_PROJECT_UUID_NOT_PRESENT = 42200001,
  BUCKET_STORAGE_PLAN_ID_NOT_PRESENT = 42200002,
  BUCKET_NAME_NOT_PRESENT = 42200003,
  DIRECTORY_BUCKET_ID_NOT_PRESENT = 42200004,
  DIRECTORY_NAME_NOT_PRESENT = 42200005,
  BUCKET_UUID_NOT_PRESENT = 42200006,
  PATH_NOT_PRESENT = 42200007,
  FILE_NAME_NOT_PRESENT = 42200008,
  FILE_CONTENT_TYPE_NOT_PRESENT = 42200009,
  SESSION_UUID_NOT_PRESENT = 42200010,
  BUCKET_TYPE_NOT_PRESENT = 42200011,
  CREATE_API_KEY_PROJECT_UUID_NOT_PRESENT = 42200012,
  PROJECT_UUID_QUERY_PARAM_NOT_PRESENT = 42200013,
  API_KEY_ROLE_API_KEY_ID_NOT_PRESENT = 42200014,
  API_KEY_ROLE_ROLE_ID_NOT_PRESENT = 42200015,
  API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT = 42200016,
  API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT = 42200017,
  API_KEY_ROLE_ROLE_ID_NOT_VALID = 42200018,
  BUCKET_WEBHOOK_BUCKET_ID_NOT_PRESENT = 42200019,
  BUCKET_WEBHOOK_URL_NOT_PRESENT = 42200020,
  QUOTA_ID_NOT_PRESENT = 42200021,
  PROJECT_UUID_NOT_PRESENT_IN_QUERY = 42200022,
  BUCKET_TYPE_NOT_PRESENT_IN_QUERY = 42200023,
  IPNS_PROJECT_UUID_NOT_PRESENT = 42200024,
  IPNS_BUCKET_ID_NOT_PRESENT = 42200025,
  IPNS_NAME_NOT_PRESENT = 42200026,
  IPNS_IPNS_NAME_NOT_PRESENT = 42200027,
  IPNS_IPNS_VALUE_NOT_PRESENT = 42200028,
  PUBLISH_IPNS_IPNS_ID_NOT_PRESENT = 42200029,
  PUBLISH_IPNS_CID_NOT_PRESENT = 42200030,
  TASK_ID_NOT_PRESENT = 42200031,
  USER_OAUTH_TOKEN_NOT_PRESENT = 42200032,
  USER_OAUTH_VERIFIER_NOT_PRESENT = 42200033,
  TWEET_ID_NOT_PRESENT = 42200034,
  PRODUCT_ID_NOT_PRESENT = 42200035,
  WEBSITE_PROJECT_UUID_NOT_PRESENT = 42200036,
  WEBSITE_NAME_NOT_PRESENT = 42200037,
  DEPLOY_WEBSITE_ID_NOT_PRESENT = 42200038,
  DEPLOY_ENVIRONMENT_NOT_PRESENT = 42200039,
  FILES_PROPERTY_NOT_PRESENT = 42200040,
  FILES_PROPERTY_EMPTY = 42200041,
  PREPARE_AND_DEPLOY_COLLECTION_IMAGE_SESSION_NOT_PRESENT = 42200042,
  PREPARE_AND_DEPLOY_COLLECTION_METADATA_SESSION_NOT_PRESENT = 42200043,
  USER_WALLET_ADDRESS_NOT_PRESENT = 42200050,
  USER_AUTH_SIGNATURE_NOT_PRESENT = 42200051,
  USER_AUTH_TIMESTAMP_NOT_PRESENT = 42200052,
  NFT_DEPLOY_SYMBOL_NOT_PRESENT = 42200100,
  NFT_DEPLOY_SYMBOL_NOT_VALID = 42200101,
  NFT_DEPLOY_NAME_NOT_PRESENT = 42200102,
  NFT_DEPLOY_NAME_NOT_VALID = 42200103,
  NFT_DEPLOY_MAX_SUPPLY_NOT_PRESENT = 42200104,
  NFT_DEPLOY_MAX_SUPPLY_NOT_VALID = 42200105,
  NFT_DEPLOY_MINT_PRICE_NOT_PRESENT = 42200106,
  NFT_DEPLOY_MINT_PRICE_NOT_VALID = 42200107,
  NFT_DEPLOY_BASE_URI_NOT_PRESENT = 42200108,
  NFT_DEPLOY_BASE_URI_NOT_VALID = 42200109,
  NFT_DEPLOY_BASE_EXTENSION_NOT_PRESENT = 42200110,
  NFT_DEPLOY_BASE_EXTENSION_NOT_VALID = 42200111,
  NFT_DEPLOY_DROP_BOOL_NOT_PRESENT = 42200112,
  NFT_DEPLOY_DROP_TIMESTAMP_NOT_PRESENT = 42200113,
  NFT_DEPLOY_RESERVE_NOT_PRESENT = 42200114,
  NFT_DEPLOY_COLLECTION_UUI_PARAM_NOT_VALID = 42200115,
  NFT_DEPLOY_PROJECT_UUID_NOT_PRESENT = 42200116,
  NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_PRESENT = 42200117,
  NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_VALID = 42200118,
  NFT_TRANSFER_OWNERSHIP_COLLECTION_UUID_NOT_PRESENT = 42200119,
  NFT_MINT_ADDRESS_NOT_PRESENT = 42200120,
  NFT_MINT_ADDRESS_NOT_VALID = 42200121,
  NFT_MINT_QUANTITY_NOT_PRESENT = 42200122,
  NFT_MINT_QUANTITY_NOT_VALID = 42200123,
  NFT_MINT_COLLECTION_UUID_NOT_PRESENT = 42200124,
  NFT_SET_BASE_URI_NOT_PRESENT = 42200125,
  NFT_SET_BASE_URI_NOT_VALID = 42200126,
  NFT_SET_BASE_URI_COLLECTION_UUID_NOT_PRESENT = 42200127,
  NFT_PROJECT_UUID_QUERY_PARAM_NOT_PRESENT = 42200128,
  NFT_COLLECTION_UUI_PARAM_NOT_PRESENT = 42200129,
  NFT_COLLECTION_CHAIN_NOT_VALID = 42200130,
  NFT_COLLECTION_CHAIN_NOT_PRESENT = 42200131,
  NFT_COLLECTION_SOULBOUND_NOT_PRESENT = 42200132,
  NFT_COLLECTION_REVOKABLE_NOT_PRESENT = 42200133,
  NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_PRESENT = 42200134,
  NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_VALID = 42200135,
  NFT_COLLECTION_ROYALTIES_FEES_NOT_PRESENT = 42200136,
  NFT_COLLECTION_ROYALTIES_FEES_NOT_VALID = 42200137,
  TRANSACTION_REF_TABLE_PARAM_NOT_PRESENT = 42200138,
  TRANSACTION_REF_ID_PARAM_NOT_PRESENT = 42200139,
  NFT_COLLECTION_BASE_URI_NOT_PRESENT = 42200140,

  //#region Authentication
  USER_EMAIL_ALREADY_TAKEN = 42200701,
  USER_EMAIL_NOT_PRESENT = 42200702,
  USER_EMAIL_NOT_VALID = 42200703,
  VERIFICATION_IDENTITY_NOT_PRESENT = 42200704,
  IDENTITY_TOKEN_NOT_PRESENT = 42200705,
  IDENTITY_CAPTCHA_NOT_PRESENT = 42200706,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 42200707,
  IDENTITY_CREATE_INVALID_REQUEST = 42200708,
  IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT = 42200709,
  IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT = 42200710,
  DID_URI_NOT_PRESENT = 42200711,
  DID_URI_INVALID = 42200712,
  SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT = 42200713,
  SPORRAN_SESSIONID_NOT_PRESENT = 42200714,
  SPORRAN_REQUEST_MESSAGE_NOT_PRESENT = 42200715,
  SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT = 42200716,
  SPORRAN_NONCE_NOT_PRESENT = 42200717,
  AUTH_SESSION_TOKEN_NOT_PRESENT = 42200718,
  //#endregion
  //#region Blockchain
  SUBSTRATE_TRANSACTION_NOT_PRESENT = 42200801,
  SUBSTRATE_CHAIN_NOT_PRESENT = 42200802,
  SUBSTRATE_CHAIN_NOT_VALID = 42200803,
  EVM_TRANSACTION_NOT_PRESENT = 42200804,
  EVM_CHAIN_NOT_PRESENT = 42200805,
  EVM_CHAIN_NOT_VALID = 42200806,
  //#endregion
}

/**
 * Unauthorized error codes - 401000.
 */
export enum UnauthorizedErrorCodes {
  UNAUTHORIZED = 40100000,
  INVALID_TOKEN = 40100001,
  INVALID_SIGNATURE = 40100002,
}

export enum ForbiddenErrorCodes {
  FORBIDDEN = 40300000,
}

//#endregion

export enum RoleType {
  USER_ROLE = 1,
  API_KEY_ROLE = 2,
}

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
 * Must equal quote.id field in database!
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

/* OAuth link type*/
export enum OauthLinkType {
  DISCORD = 1,
  TWEETER = 2,
  GITHUB = 3,
}
