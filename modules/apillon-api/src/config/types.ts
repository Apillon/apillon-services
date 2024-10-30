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
  PROJECT_OWNER_NOT_FOUND = 40405001,
}

export enum ApiErrorCode {
  INVALID_AUTH_TOKEN = 40105000,
}
