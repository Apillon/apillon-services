export enum DbTables {
  FILE_UPLOAD_SESSION = 'file_upload_session',
  FILE_UPLOAD_REQUEST = 'file_upload_request',
  STORAGE_PLAN = 'storage_plan',
  BUCKET = 'bucket',
  DIRECTORY = 'directory',
  FILE = 'file',
  BUCKET_WEBHOOK = 'bucket_webhook',
  IPNS = 'ipns',
  WEBSITE = 'website',
  DEPLOYMENT = 'deployment',
}

export enum DbViews {
  DOMAINS = 'view_domains',
}

export enum StorageErrorCode {
  //400
  DEFAULT_BAD_REQUEST_EROR = 40006000,
  FILE_UPLOAD_SESSION_ALREADY_TRANSFERED = 40006001,
  MAX_BUCKET_SIZE_REACHED = 40006002,
  NOT_ENOUGH_SPACE_IN_BUCKET = 40006003,
  MAX_BUCKETS_REACHED = 40006004,
  BUCKET_ALREADY_MARKED_FOR_DELETION = 40006005,
  BUCKET_NOT_MARKED_FOR_DELETION = 40006006,
  DIRECTORY_ALREADY_MARKED_FOR_DELETION = 40006007,
  DIRECTORY_NOT_MARKED_FOR_DELETION = 40006008,
  FILE_ALREADY_MARKED_FOR_DELETION = 40006009,
  FILE_NOT_MARKED_FOR_DELETION = 40006010,
  BUCKET_IS_MARKED_FOR_DELETION = 40006011,
  MAX_WEBSITES_REACHED = 40006012,
  CANNOT_DELETE_FILES_IN_STG_OR_PROD_BUCKET = 40006013,
  CANNOT_CLEAR_STORAGE_BUCKET = 40006014,
  CANNOT_DELETE_HOSTING_BUCKET = 40006015,
  NO_FILES_TO_DEPLOY = 40006016,
  NO_CHANGES_TO_DEPLOY = 40006017,
  //422
  DEFAULT_VALIDATION_ERROR = 42206000,
  BUCKET_PROJECT_UUID_NOT_PRESENT = 42206001,
  BUCKET_STORAGE_PLAN_ID_NOT_PRESENT = 42206002,
  BUCKET_NAME_NOT_PRESENT = 42206003,
  DIRECTORY_BUCKET_ID_NOT_PRESENT = 42206004,
  DIRECTORY_NAME_NOT_PRESENT = 42206005,
  FILE_UPLOAD_REQUEST_BUCKET_ID_NOT_PRESENT = 42206006,
  FILE_UPLOAD_REQUEST_S3_FILE_KEY_NOT_PRESENT = 42206007,
  FILE_UPLOAD_REQUEST_S3_FILE_NAME_NOT_PRESENT = 42206008,
  FILE_UPLOAD_REQUEST_S3_FILE_CONTENT_TYPE_NOT_PRESENT = 42206009,
  FILE_UPLOAD_REQUEST_S3_SESSION_ID_NOT_PRESENT = 42206010,
  NO_FILES_FOR_TRANSFER_TO_IPFS = 42206011,
  FILE_CID_NOT_PRESENT = 42206012,
  FILE_NAME_NOT_PRESENT = 42206013,
  FILE_CONTENT_TYPE_NOT_PRESENT = 42206014,
  FILE_BUCKET_ID_NOT_PRESENT = 42206015,
  BUCKET_TYPE_NOT_PRESENT = 42206016,
  FILE_UPLOAD_SESSION_BUCKET_ID_NOT_PRESENT = 42206017,
  SESSION_UUID_BELONGS_TO_OTHER_BUCKET = 42206018,
  FILE_UPLOAD_SESSION_PROJECT_UUID_NOT_PRESENT = 42206019,
  FILE_PROJECT_UUID_NOT_PRESENT = 42206020,
  BUCKET_WEBHOOK_BUCKET_ID_NOT_PRESENT = 42206021,
  BUCKET_WEBHOOK_URL_NOT_PRESENT = 42206022,
  NO_FILES_ON_S3_FOR_TRANSFER = 42206023,
  BUCKET_TYPE_NOT_VALID = 42206024,
  IPNS_PROJECT_UUID_NOT_PRESENT = 42206025,
  IPNS_BUCKET_ID_NOT_PRESENT = 42206026,
  IPNS_NAME_NOT_PRESENT = 42206027,
  IPNS_IPNS_NAME_NOT_PRESENT = 42206028,
  IPNS_IPNS_VALUE_NOT_PRESENT = 42206029,
  WEBSITE_PROJECT_UUID_NOT_PRESENT = 42206030,
  WEBSITE_BUCKET_ID_NOT_PRESENT = 42206031,
  WEBSITE_STAGING_BUCKET_ID_NOT_PRESENT = 42206032,
  WEBSITE_PRODUCTION_BUCKET_ID_NOT_PRESENT = 42206033,
  WEBSITE_NAME_NOT_PRESENT = 42206034,
  DEPLOYMENT_BUCKET_ID_NOT_PRESENT = 42206035,
  DEPLOYMENT_WEBSITE_ID_NOT_PRESENT = 42206036,
  DEPLOYMENT_ENVIRONMENT_NOT_PRESENT = 42206037,
  WEBSITE_UUID_NOT_PRESENT = 42206038,
  DEPLOYMENT_ENVIRONMENT_NOT_VALID = 42206039,

  //404
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40406000,
  FILE_DOES_NOT_EXISTS_IN_BUCKET = 40406001,
  BUCKET_NOT_FOUND = 40406002,
  DIRECTORY_NOT_FOUND = 40406003,
  FILE_UPLOAD_SESSION_NOT_FOUND = 40406004,
  FILE_DOES_NOT_EXISTS = 40406005,
  BUCKET_WEBHOOK_NOT_FOUND = 40406006,
  FILE_NOT_FOUND = 40406007,
  FILE_UPLOAD_REQUEST_NOT_FOUND = 40406008,
  IPNS_RECORD_NOT_FOUND = 40406009,
  WEBSITE_NOT_FOUND = 40406010,
  DEPLOYMENT_NOT_FOUND = 40406011,
  //409
  WEBHOOK_ALREADY_EXISTS_FOR_PROJECT = 40906001,
  //500
  STORAGE_IPFS_API_NOT_SET = 50006001,
  STORAGE_CRUST_SEED_NOT_SET = 50006002,
  ERROR_AT_GENERATE_S3_SIGNED_URL = 50006003,
  INVALID_BODY_FOR_WORKER = 50006004,
  INVALID_DATA_PASSED_TO_WORKER = 50006005,
  ERROR_CREATING_IPNS_RECORD = 50006006,
  INVALID_PARAMETERS_FOR_DEPLOYMENT_WORKER = 50006007,
  FAILED_TO_GENERATE_IPFS_KEYPAIR = 5006008,
}

export enum FileUploadRequestFileStatus {
  SIGNED_URL_FOR_UPLOAD_GENERATED = 1,
  UPLOADED_TO_S3 = 2,
  UPLOADED_TO_IPFS = 3,
  PINNED_TO_CRUST = 4,
  UPLOAD_COMPLETED = 5,
  ERROR_UPLOADING_TO_IPFS = 100,
  ERROR_PINING_TO_CRUST = 101,
  ERROR_FILE_NOT_EXISTS_ON_S3 = 102,
  ERROR_BUCKET_FULL = 103,
  ERROR_FILE_UPLOAD_REQUEST_DOES_NOT_EXISTS = 104,
  ERROR_CREATING_FILE_OBJECT = 105,
}

export enum BucketType {
  STORAGE = 1,
  HOSTING = 2,
}

export enum FileStatus {
  REQUEST_FOR_UPLOAD_GENERATED = 1,
  UPLOADED_TO_S3 = 2,
  UPLOADED_TO_IPFS = 3,
  PINNED_TO_CRUST = 4,
}

export enum BucketWebhookAuthMethod {
  BASIC = 'basic',
  TOKEN = 'bearer-token',
}

export enum DeploymentEnvironment {
  STAGING = 1,
  PRODUCTION = 2,
  DIRECT_TO_PRODUCTION = 3,
}

export enum DeploymentStatus {
  INITIATED = 0,
  IN_PROGRESS = 1,
  SUCCESSFUL = 10,
  FAILED = 100,
}

/**
 * Type of object inside bucket
 */
export enum ObjectType {
  DIRECTORY = 1,
  FILE = 2,
}
