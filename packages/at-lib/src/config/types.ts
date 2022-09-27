export enum AmsEventType {
  USER_AUTH = 'user-auth',
  USER_LOGIN = 'user-login',
}

export enum LmasEventType {
  WRITE_LOG = 'write-log',
  SEND_ALERT = 'send-alert',
  NOTIFY = 'notify',
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
}

export enum SqlModelStatus {
  DRAFT = 1,
  INCOMPLETE = 2,
  ACTIVE = 5,
  DELETED = 9,
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
  ADMIN = 1, // System's admin
  USER = 2, // basic user with access to platform
}

//#endregion

//#region Codes

export enum ErrorCode {
  STATUS_NOT_PRESENT = 422100,
  INVALID_STATUS = 422101,
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
}

/**
 * Route error codes - 400000.
 */
export enum BadRequestErrorCode {
  DEFAULT_ROUTE_ERROR_CODE = 400000,
  INVALID_PATH = 400001,
}

//#endregion

//#region JWT Token types

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  USER_AUTHENTICATION = 'USER_AUTHENTICATION',
  USER_TEMP_LOGIN = 'USER_TEMP_LOGIN',
  USER_RESET_PASSWORD = 'USER_RESET_PASSWORD',
  USER_RESET_EMAIL = 'USER_RESET_EMAIL',
  USER_CONFIRM_EMAIL = 'USER_CONFIRM_EMAIL',
  ADMIN_MFA_LOGIN = 'ADMIN_MFA_LOGIN',
  USER_REGISTER = 'USER_REGISTER',
  USER_WELCOME = 'USER_WELCOME',
}

/**
 * Authentication token data interface.
 */
export interface AuthenticationTokenData {
  userId: number | string;
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

//#endregion
