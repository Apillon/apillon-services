export enum DbTables {
  USER = 'user',
  PROJECT = 'project',
  SERVICE_TYPE = 'service_type',
  SERVICE = 'service',
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 422000,
  CREATE_USER_DTO_EMAIL_NOT_VALID = 422100,
  CREATE_USER_DTO_EMAIL_NOT_PRESENT = 422101,
  USER_UUID_NOT_PRESENT = 422103,
  PROJECT_NAME_NOT_PRESENT = 422201,
  PROJECT_UUID_NOT_PRESENT = 422202,
  SERVICE_NAME_NOT_PRESENT = 422301,
  SERVICE_TYPE_NOT_PRESENT = 422302,
}

/**
 * Resource not found error codes - 404000.
 */

export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404000,
  USER_DOES_NOT_EXISTS = 404001,
  PROJECT_DOES_NOT_EXISTS = 404002,
  SERVICE_DOES_NOT_EXIST = 404003,
}

// export class SerializeForServices {
//   public static LIST = 'list';
// }
