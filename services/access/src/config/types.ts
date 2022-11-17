export enum DbTables {
  AUTH_USER = 'authUser',
  AUTH_USER_ROLE = 'authUser_role',
  ROLE = 'role',
  API_KEY = 'apiKey',
  API_KEY_ROLE = 'apiKey_role',
  PERMISSION = 'permission',
  ROLE_PERMISSION = 'role_permission',
  AUTH_TOKEN = 'authToken',
}

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 * HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
 * MODULE CODE:
 *  00 - general
 *  01 - @apillon/lib
 *  02 - AMS      <----
 *  03 - lmas
 *  04 - dev-api
 *  ...
 *  INTERNAL ERROR CODE: 000 - 999
 *
 **/
export enum AmsErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 42202000,
  INVALID_STATUS = 42202001,
  EMAIL_NOT_PRESENT = 42202002,
  USER_EMAIL_NOT_VALID = 42202003,
  USER_EMAIL_ALREADY_TAKEN = 42202004,
  USER_UUID_NOT_PRESENT = 42202005,
  USER_UUID_ALREADY_EXISTS = 42202006,
  USER_PASSWORD_NOT_PRESENT = 42202007,
  USER_AUTH_TOKEN_NOT_PRESENT = 42202008,
  USER_AUTH_TOKEN_EXPIRES_IN_NOT_PRESENT = 42202009,
  USER_AUTH_TOKEN_TYPE_NOT_PRESENT = 42202010,
  API_KEY_NOT_PRESENT = 42202011,
  API_KEY_SECRET_NOT_PRESENT = 42202012,
  API_KEY_PROJECT_UUID_NOT_PRESENT = 42202013,
  API_KEY_ROLE_API_KEY_ID_NOT_PRESENT = 42202014,
  API_KEY_ROLE_ROLE_ID_NOT_PRESENT = 42202015,
  API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT = 42202016,
  API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT = 42202017,
  API_KEY_ROLE_SERVICE_TYPE_ID_NOT_PRESENT = 42202018,

  // 400 - Bad request
  BAD_REQUEST = 40002001,
  USER_DOES_NOT_EXISTS = 40002100,
  USER_ALREADY_REGISTERED = 40002101,
  USER_AUTH_TOKEN_NOT_EXISTS = 40002200,
  USER_AUTH_TOKEN_IS_INVALID = 40002201,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40102100,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40302100,
  INVALID_API_KEY = 40302001,

  // 404 - Not found
  API_KEY_NOT_FOUND = 40402001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50002001,
  ERROR_READING_FROM_DATABASE = 50002002,
}

/**
 * Authentication token data interface.
 */
export interface AuthenticationTokenData {
  id: number | string;
  email: string;
  wallet: string;
  user_uuid: string;
  authUserRoles: string;
  status: number;
}

/**
 * Reset user's password token data interface.
 */
export interface ResetUserPasswordTokenData {
  email: string;
}

/**
 * Reset user's email token data interface.
 */
export interface ResetUserEmailTokenData {
  userId: number;
  email: string;
  email2: string;
  secondary: boolean;
}

/**
 * Confirm user's email token data interface.
 */
export interface ConfirmUserEmailTokenData {
  email: string;
}

/**
 * Confirm user's email token data interface.
 */
export interface MFAAuthenticationTokenData {
  userId: number;
}
/**
 * Register user token data interface.
 */
export interface RequestUserRegisterTokenData {
  email: string;
}

/**
 * Welcome email token data interface
 */
export interface UserWelcomeTokenData {
  user_id: number;
}

/**
 * Token data definition.
 */
export type TokenData =
  | UserWelcomeTokenData
  | AuthenticationTokenData
  | ResetUserPasswordTokenData
  | ResetUserEmailTokenData
  | MFAAuthenticationTokenData
  | RequestUserRegisterTokenData;

export enum TokenExpiresInStr {
  EXPIRES_IN_1_DAY = '1d', // Set to one day - for internal usage mostly
}

//#region SQL stuff - TODO: Should be streamlined? This is part of the SQL lib, not access
export enum SqlModelStatus {
  DRAFT = 1,
  INCOMPLETE = 2,
  ACTIVE = 5,
  DELETED = 9,
}

//#endregion
