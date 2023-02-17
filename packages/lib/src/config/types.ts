export enum AmsEventType {
  USER_REGISTER = 'user-register',
  USER_GET_AUTH = 'user-get-auth',
  USER_LOGIN = 'user-login',
  USER_UPDATE = 'user-update',
  USER_PASSWORD_RESET = 'user-password-reset',
  USER_ROLE_ASSIGN = 'user-role-assign',
  USER_ROLE_REMOVE = 'user-role-remove',
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
}

export enum LmasEventType {
  WRITE_LOG = 'write-log',
  WRITE_REQUEST_LOG = 'write-request-log',
  SEND_ALERT = 'send-alert',
  SEND_ADMIN_ALERT = 'send-admin-alert',
  NOTIFY = 'notify',
}

export enum StorageEventType {
  REQUEST_S3_SIGNED_URL_FOR_UPLOAD = 'request-s3-signed-url-for-upload',
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
}

export enum MailEventType {
  SEND_MAIL = 'send-mail',
  SEND_CUSTOM_MAIL = 'send-custom-mail',
}

export enum ScsEventType {
  GET_QUOTA = 'get-quota',
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
  REFERRAL = 'REFERRAL',
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

//#region Permissions

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
}

/**
 * Unauthorized error codes - 401000.
 */
export enum UnauthorizedErrorCodes {
  UNAUTHORIZED = 40100000,
  INVALID_TOKEN = 40100000,
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
  USER_AUTHENTICATION = 'USER_AUTHENTICATION',
  USER_RESET_PASSWORD = 'USER_RESET_PASSWORD',
  USER_RESET_EMAIL = 'USER_RESET_EMAIL',
  USER_CONFIRM_EMAIL = 'USER_CONFIRM_EMAIL',
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
}
