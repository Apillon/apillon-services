export enum DbTables {
  USER = 'user',
  PROJECT = 'project',
  SERVICE_TYPE = 'service_type',
  SERVICE = 'service',
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 422000,
  CREATE_USER_DTO_EMAIL_NOT_VALID = 422001,
  CREATE_USER_DTO_EMAIL_NOT_PRESENT = 422002,
  USER_UUID_NOT_PRESENT = 422003,
  PROJECT_NAME_NOT_PRESENT = 422004,
  PROJECT_UUID_NOT_PRESENT = 422005,
}

/**
 * Resource not found error codes - 404000.
 */

export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404000,
  USER_DOES_NOT_EXISTS = 404001,
  PROJECT_DOES_NOT_EXISTS = 404002,
}
