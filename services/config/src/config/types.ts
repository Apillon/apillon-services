export enum DbTables {
  QUOTA = 'quota',
  OVERRIDE = 'override',
  QUOTA_TEMPLATE = 'quotaTemplate',
  TEMPLATE_VALUE = 'templateValue',
  TERMS = 'terms',
}

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 **/
export enum ConfigErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 422_10_000,
  INVALID_STATUS = 422_10_001,
  PROJECT_OR_OBJECT_UUID_NOT_PRESENT = 422_10_002,
  INVALID_QUOTA_TYPE = 422_10_003,

  // 400 - Bad request
  BAD_REQUEST = 400_10_001,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 401_10_100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 403_10_100,
  INVALID_API_KEY = 403_10_001,

  // 404 - Not found
  API_KEY_NOT_FOUND = 404_10_001,
  QUOTA_NOT_FOUND = 404_01_0002,
  OVERRIDE_NOT_FOUND = 404_01_0003,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 500_10_001,
  ERROR_READING_FROM_DATABASE = 500_10_002,
}
