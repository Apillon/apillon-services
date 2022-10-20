import { ServiceCode } from 'at-lib';

export enum DbTables {
  FILE_UPLOAD_SESSION = 'file_upload_session',
  FILE_UPLOAD_REQUEST = 'file_upload_request',
  STORAGE_PLAN = 'storage_plan',
  BUCKET = 'bucket',
  DIRECTORY = 'directory',
  FILE = 'file',
}

export enum StorageErrorCode {
  DEFAULT_VALIDATION_ERROR = 42206000,
  BUCKET_PROJECT_UUID_NOT_PRESENT = 42206001,
  BUCKET_STORAGE_PLAN_ID_NOT_PRESENT = 42206002,
  BUCKET_NAME_NOT_PRESENT = 42206003,
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40406000,
  FILE_DOES_NOT_EXISTS_IN_BUCKET = 40406001,
  BUCKET_NOT_FOUND = 40406002,
}
