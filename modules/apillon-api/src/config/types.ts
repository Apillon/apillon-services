export enum DbTables {}

/**
 * Validation error codes - 422_05_000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 422_05_000,
}

/**
 * Resource not found error codes - 404000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404_05_000,
}

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  AUTH_SESSION = 'auth-session',
  USER_AUTHENTICATION = 'user-authentication',
}
