export enum DbTables {
  USER = 'user',
  PROJECT = 'project',
  SERVICE_TYPE = 'service_type',
  SERVICE = 'service',
  PROJECT_USER = 'project_user',
  FILE = 'file',
}

/**
 * Validation error codes - 422000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 422000,
  CREATE_USER_DTO_EMAIL_NOT_VALID = 422100,
  CREATE_USER_DTO_EMAIL_NOT_PRESENT = 422101,
  USER_UUID_NOT_PRESENT = 422102,
  PROJECT_NAME_NOT_PRESENT = 422201,
  PROJECT_UUID_NOT_PRESENT = 422202,
  SERVICE_NAME_NOT_PRESENT = 422301,
  SERVICE_TYPE_NOT_PRESENT = 422302,
  FILE_NAME_NOT_PRESENT = 422401,
  FILE_EXTENSION_NOT_PRESENT = 422402,
  FILE_CONTENT_TYPE_NOT_PRESENT = 422403,
  FILE_VERSION_NOT_PRESENT = 422404,
  FILE_BODY_NOT_PRESENT = 422405,
}

/**
 * Resource not found error codes - 404000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404000,
  USER_DOES_NOT_EXISTS = 404001,
  PROJECT_DOES_NOT_EXISTS = 404002,
  SERVICE_DOES_NOT_EXIST = 404003,
  FILE_DOES_NOT_EXISTS = 404004,
  FILE_DOES_NOT_EXISTS_IN_BUCKET = 404005,
}
