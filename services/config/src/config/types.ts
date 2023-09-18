export enum DbTables {
  QUOTA = 'quota',
  OVERRIDE = 'override',
  QUOTA_TEMPLATE = 'quotaTemplate',
  TEMPLATE_VALUE = 'templateValue',
  TERMS = 'terms',
  CREDIT = 'credit',
  CREDIT_TRANSACTION = 'creditTransaction',
  PRODUCT = 'product',
  PRODUCT_PRICE = 'productPrice',
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
  PROJECT_OR_OBJECT_UUID_NOT_PRESENT = 42210002,
  INVALID_QUOTA_TYPE = 42210003,
  CREDIT_QUOTA_UUID_NOT_PRESENT = 42210004,

  // 400 - Bad request
  BAD_REQUEST = 40010001,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40110100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40310100,
  INVALID_API_KEY = 40310001,

  // 404 - Not found
  API_KEY_NOT_FOUND = 40410001,
  QUOTA_NOT_FOUND = 404010002,
  OVERRIDE_NOT_FOUND = 404010003,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50010001,
  ERROR_READING_FROM_DATABASE = 50010002,
  ERROR_ADDING_CREDIT = 50010003,
}
