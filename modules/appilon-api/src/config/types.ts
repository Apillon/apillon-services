import { ServiceCode } from 'at-lib';

export enum DbTables {}

/**
 * Validation error codes - 422000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42205000,
  FILE_PATH_NOT_PRESENT = 42205001,
  FILE_CONTENT_NOT_PRESENT = 42205002,
  FILES_NOT_PRESENT = 42205003,
}

/**
 * Resource not found error codes - 404000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40405000,
}
