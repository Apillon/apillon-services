export enum DbTables {
  AUTH_USER = 'authUser',
  AUTH_USER_ROLE = 'authUser_role',
  ROLE = 'role',
  API_KEY = 'apiKey',
  API_KEY_ROLE = 'apiKey_role',
  PERMISSION = 'permission',
  ROLE_PERMISSION = 'role_permission',
}

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 * HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
 * MODULE CODE:
 *  00 - general
 *  01 - at-lib
 *  02 - AMS      <----
 *  03 - lmas
 *  04 - dev-api
 *  ...
 *  INTERNAL ERROR CODE: 000 - 999
 *
 **/
export enum AmsErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 42200100,
  INVALID_STATUS = 42200101,
  EMAIL_NOT_PRESENT = 42202100,
  USER_EMAIL_NOT_VALID = 42202101,
  USER_EMAIL_ALREADY_TAKEN = 42202102,
  USER_UUID_NOT_PRESENT = 42202103,
  USER_UUID_ALREADY_EXISTS = 42202104,
  USER_PASSWORD_NOT_PRESENT = 42202105,

  // 400 - Bad request
  BAD_REQUEST = 40002001,
  USER_DOES_NOT_EXISTS = 40002100,
  USER_ALREADY_REGISTERED = 40002101,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40102100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40302100,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50002001,
  ERROR_READING_FROM_DATABASE = 50002002,
}
