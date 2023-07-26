export enum DbTables {
  USER = 'user',
  PROJECT = 'project',
  SERVICE_TYPE = 'service_type',
  SERVICE = 'service',
  PROJECT_USER = 'project_user',
  FILE = 'file',
  PROJECT_API_KEY = 'project_api_key',
  INSTRUCTION = 'instruction',
  PROJECT_USER_PENDING_INVITATION = 'project_user_pending_invitation',
}

/**
 * Validation error codes - 42204000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42204000,
  TOKEN_NOT_PRESENT = 42204001,
  USER_PASSWORD_TOO_SHORT = 42204100,
  USER_UUID_NOT_PRESENT = 42204102,
  USER_EMAIL_NOT_PRESENT = 42204103,
  USER_EMAIL_NOT_VALID = 42204104,
  USER_EMAIL_ALREADY_TAKEN = 42204105,
  USER_PASSWORD_NOT_PRESENT = 42204106,
  USER_INVALID_LOGIN = 42204107,
  USER_KILT_PRESENTATION_NOT_PRESENT = 42204108,
  CAPTCHA_NOT_PRESENT = 42204109,
  CAPTCHA_CHALLENGE_INVALID = 42204111,
  USER_WALLET_ADDRESS_NOT_PRESENT = 42204112,
  USER_AUTH_SIGNATURE_NOT_PRESENT = 42204113,
  USER_AUTH_TIMESTAMP_NOT_PRESENT = 42204114,
  USER_CONSENT_IS_REQUIRED = 42204115,
  PROJECT_NAME_NOT_PRESENT = 42204201,
  PROJECT_UUID_NOT_PRESENT = 42204202,
  PROJECT_ID_NOT_PRESENT = 42204203,
  SERVICE_NAME_NOT_PRESENT = 42204301,
  SERVICE_TYPE_NOT_PRESENT = 42204302,
  SERVICE_UUID_NOT_PRESENT = 42204303,
  SERVICE_PROJECT_ID_NOT_PRESENT = 42204304,
  SERVICE_NOT_IN_THIS_PROJECT = 42204305,
  SERVICE_TYPE_ID_NOT_VALID = 42204306,
  FILE_NAME_NOT_PRESENT = 42204401,
  FILE_EXTENSION_NOT_PRESENT = 42204402,
  FILE_CONTENT_TYPE_NOT_PRESENT = 42204403,
  FILE_VERSION_NOT_PRESENT = 42204404,
  FILE_BODY_NOT_PRESENT = 42204405,
  INSTRUCTION_NAME_NOT_PRESENT = 42204501,
  INSTRUCTION_ENUM_NOT_PRESENT = 42204502,
  INSTRUCTION_FORROUTE_NOT_PRESENT = 42204503,
  INSTRUCTION_ENUM_EXISTS = 42204504,
  INSTRUCTION_TYPE_NOT_PRESENT = 42204505,
  INSTRUCTION_HTML_CONTENT_NOT_PRESENT = 42204506,
  INSTRUCTION_FOR_ROUTE_NOT_PRESENT = 42204507,
  PROJECT_USER_USER_ID_NOT_PRESENT = 42204601,
  PROJECT_USER_PROJECT_ID_NOT_PRESENT = 42204602,
  PROJECT_USER_ACTION_NOT_PRESENT = 42204603,
  PROJECT_USER_INVALID_ACTION = 42204604,
  PROJECT_USER_RELATION_EXISTS = 42204605,
  PROJECT_USER_EMAIL_NOT_PRESENT = 42204606,
  PROJECT_USER_ROLE_ID_NOT_PRESENT = 42204607,
  PROJECT_USER_ROLE_ID_NOT_VALID = 42204608,
  UPDATE_ROLE_ON_PROJECT_ROLE_ID_NOT_PRESENT = 42204611,
}

/**
 * Resource not found error codes - 40404000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40404000,
  USER_DOES_NOT_EXISTS = 40404001,
  PROJECT_DOES_NOT_EXISTS = 40404002,
  SERVICE_DOES_NOT_EXIST = 40404003,
  FILE_DOES_NOT_EXISTS = 40404004,
  FILE_DOES_NOT_EXISTS_IN_BUCKET = 40404005,
  INSTRUCTION_DOES_NOT_EXIST = 40404006,
  PROJECT_USER_DOES_NOT_EXIST = 40404007,
  USER_EMAIL_NOT_EXISTS = 40404008,
}

/**
 * Conflict error codes - 40904000.
 */
export enum ConflictErrorCode {
  DEFAULT_CONFLICT_ERROR = 40904000,
  USER_ALREADY_ON_PROJECT = 40904001,
}

/**
 * Bad request error codes - 40004000.
 */
export enum BadRequestErrorCode {
  DEFAULT_BAD_REQUEST_ERROR = 40004000,
  CANNOT_MODIFY_PROJECT_OWNER = 40004001,
  ROLE_ON_PROJECT_ALREADY_ASSIGNED = 40004002,
  MAX_NUMBER_OF_PROJECTS_REACHED = 40004100,
  MAX_NUMBER_OF_USERS_ON_PROJECT_REACHED = 40004101,
}

/**
 * Instruction Type Enum { Helper, Video, Q&A }
 */
export enum InstructionType {
  INSTRUCTION = 1,
  INFO = 2,
  W3_WARN = 3,
  VIDEO = 4,
  WIKI = 5,
}
