export enum DbTables {}

/**
 * Validation error codes - 42207000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42207000,
  // This is the same as the error codes from the console-api
  USER_EMAIL_ALREADY_TAKEN = 42207001,
  USER_EMAIL_NOT_PRESENT = 42207002,
  USER_EMAIL_NOT_VALID = 42207003,
  ATTESTATION_STATE_NOT_PRESENT = 42207004,
}

/**
 * Resource not found error codes - 40407000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40407000,
}

export enum DbTables {
  ATTESTATION = 'attestation',
}

export enum AttestationState {
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  REJECTED = 'rejected',
}
