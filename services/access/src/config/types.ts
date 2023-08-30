export enum DbTables {
  AUTH_USER = 'authUser',
  AUTH_USER_ROLE = 'authUser_role',
  ROLE = 'role',
  API_KEY = 'apiKey',
  API_KEY_ROLE = 'apiKey_role',
  PERMISSION = 'permission',
  ROLE_PERMISSION = 'role_permission',
  AUTH_TOKEN = 'authToken',
  OAUTH_LINK = 'oauthLink',
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
  STATUS_NOT_PRESENT = 422_02_000,
  INVALID_STATUS = 422_02_001,
  EMAIL_NOT_PRESENT = 422_02_002,
  USER_EMAIL_NOT_VALID = 422_02_003,
  USER_EMAIL_ALREADY_TAKEN = 422_02_004,
  USER_UUID_NOT_PRESENT = 422_02_005,
  USER_UUID_ALREADY_EXISTS = 422_02_006,
  USER_PASSWORD_NOT_PRESENT = 422_02_007,
  USER_AUTH_TOKEN_NOT_PRESENT = 422_02_008,
  USER_AUTH_TOKEN_EXPIRES_IN_NOT_PRESENT = 422_02_009,
  USER_AUTH_TOKEN_TYPE_NOT_PRESENT = 422_02_010,
  API_KEY_NOT_PRESENT = 422_02_011,
  API_KEY_SECRET_NOT_PRESENT = 422_02_012,
  API_KEY_PROJECT_UUID_NOT_PRESENT = 422_02_013,
  API_KEY_ROLE_API_KEY_ID_NOT_PRESENT = 422_02_014,
  API_KEY_ROLE_ROLE_ID_NOT_PRESENT = 422_02_015,
  API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT = 422_02_016,
  API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT = 422_02_017,
  API_KEY_ROLE_SERVICE_TYPE_ID_NOT_PRESENT = 422_02_018,
  OAUTH_LINK_TYPE_NOT_PRESENT = 422_02_020,
  OAUTH_EXTERNAL_USER_ID_NOT_PRESENT = 422_02_021,

  // 400 - Bad request
  BAD_REQUEST = 400_02_001,
  USER_DOES_NOT_EXISTS = 400_02_100,
  USER_ALREADY_REGISTERED = 400_02_101,
  USER_AUTH_TOKEN_NOT_EXISTS = 400_02_200,
  USER_AUTH_TOKEN_IS_INVALID = 400_02_201,
  MAX_API_KEY_QUOTA_REACHED = 400_02_300,
  INVALID_API_KEY = 400_02_400,
  OAUTH_EXTERNAL_USER_ID_ALREADY_PRESENT = 400_02_500,
  OAUTH_CREDENTIALS_INVALID = 400_02_501,
  OAUTH_SERVICE_CONNECTION_FAILED = 400_02_502,
  INVALID_TOKEN = 400_02_600,
  WALLET_SIGNATURE_ALREADY_USED = 400_02_700,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 401_02_100,
  AUTH_TOKEN_EXPIRED = 401_02_1001,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 403_02_100,

  // 404 - Not found
  API_KEY_NOT_FOUND = 404_02_001,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 500_02_001,
  ERROR_READING_FROM_DATABASE = 500_02_002,
  INVALID_EVENT_DATA = 500_02_003,
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
