export enum DbTables {
  QUOTA = 'quota',
  OVERRIDE = 'override',
  QUOTA_TEMPLATE = 'quotaTemplate',
  TEMPLATE_VALUE = 'templateValue',
}

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 **/
export enum ConfigErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 42210000,
  INVALID_STATUS = 42210001,

  // 400 - Bad request
  BAD_REQUEST = 40010001,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40110100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40310100,
  INVALID_API_KEY = 40310001,

  // 404 - Not found
  API_KEY_NOT_FOUND = 40410001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50010001,
  ERROR_READING_FROM_DATABASE = 50010002,
}