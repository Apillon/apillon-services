export enum DbTables {
  USER = 'user',
  PROJECT = 'project',
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 422000,
  CREATE_USER_DTO_EMAIL_NOT_VALID = 422001,
  CREATE_USER_DTO_EMAIL_NOT_PRESENT = 422002,
  USER_UUID_NOT_PRESENT = 422003,
  PROJECT_NAME_NOT_PRESENT = 422004,
  PROJECT_UUID_NOT_PRESENT = 422005,
}
