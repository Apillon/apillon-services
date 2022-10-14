import { ServiceCode } from 'at-lib';

export enum DbTables {}

/**
 * Validation error codes - 42206000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42206000,
}

/**
 * Resource not found error codes - 40406000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40406000,
  FILE_DOES_NOT_EXISTS_IN_BUCKET = 40406001,
}
