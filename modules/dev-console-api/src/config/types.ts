export enum DbTables {
  USER = 'user',
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 422000,
  CREATE_USER_DTO_EMAIL_NOT_VALID = 422001,
  USER_UUID_NOT_PRESENT = 422002,
}
