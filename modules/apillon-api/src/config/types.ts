export enum DbTables {}

/**
 * Validation error codes - 42205000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42205000,
}

/**
 * Resource not found error codes - 404000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40405000,
}

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  AUTH_SESSION = 'auth-session',
  // TODO: Change this to kebab-case
  USER_AUTHENTICATION = 'USER_AUTHENTICATION',
}
