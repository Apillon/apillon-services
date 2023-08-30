/**
 * Validation error codes - 422_07_000.
 */
export enum AuthenticationErrorCode {
  // TODO: Review correct code order (in the end)
  DEFAULT_VALIDATION_ERROR = 422_07_000,
  // This is the same as the error codes from the console-api
  USER_EMAIL_ALREADY_TAKEN = 422_07_0001,
  USER_EMAIL_NOT_PRESENT = 422_07_0002,
  USER_EMAIL_NOT_VALID = 422_07_0003,
  IDENTITY_EMAIL_NOT_PRESENT = 422_07_0100,
  IDENTITY_DOES_NOT_EXIST = 422_07_0101,
  IDENTITY_STATE_NOT_PRESENT = 422_07_0102,
  IDENTITY_INVALID_VERIFICATION_TOKEN = 422_07_0103,
  IDENTITY_INVALID_TOKEN_DATA = 422_07_0104,
  IDENTITY_VERIFICATION_FAILED = 422_07_0105,
  IDENTITY_TOKEN_NOT_PRESENT = 422_07_0106,
  IDENTITY_INVALID_STATE = 422_07_0107,
  IDENTITY_INVALID_REQUEST = 422_07_0108,
  IDENTITY_MNEMONIC_NOT_PRESENT = 422_07_0109,
  IDENTITY_DID_URI_NOT_PRESENT = 422_07_0110,
  IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT = 422_07_0111,
  IDENTITY_CREATE_INVALID_REQUEST = 422_07_0112,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 422_07_0113,
  IDENTITY_CREATE_SENDER_KEY_NOT_PRESENT = 422_07_0114,
  IDENTITY_EMAIL_IS_ALREADY_ATTESTED = 422_07_0115,
  IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT = 422_07_0116,
  IDENTITY_CAPTCHA_NOT_CONFIGURED = 422_07_0117,
  IDENTITY_CAPTCHA_INVALID = 422_07_0118,
  IDENTITY_CAPTCHA_NOT_PRESENT = 422_07_0119,
  DID_URI_NOT_PRESENT = 422_07_0200,
  DID_URI_INVALID = 422_07_0201,
  VERIFICATION_IDENTITY_NOT_PRESENT = 422_07_0300,
  VERIFICATION_CHALLENGE_NOT_PRESENT = 422_07_0301,
  VERIFICATION_INVALID_CHALLENGE = 422_07_0302,
  SPORRAN_INVALID_REQUEST = 422_07_0401,
  SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT = 422_07_0402,
  SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT = 422_07_0403,
  SPORRAN_NONCE_NOT_PRESENT = 422_07_0404,
  SPORRAN_SESSIONID_NOT_PRESENT = 422_07_0405,
  SPORRAN_VERIFIER_DID_DOES_NOT_EXIST = 422_07_0406,
  SPORRAN_VERIFIER_KA_DOES_NOT_EXIST = 422_07_0407,
  SPORRAN_REQUEST_MESSAGE_NOT_PRESENT = 422_07_0407,
  UPLOAD_WALLETS_INVALID_ASSETS = 422_07_0501,
}

// Sporran specifics
export const APILLON_DAPP_NAME = 'ApillonDApp';

/**
 * Resource not found error codes - 404_07_000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404_07_000,
}

export enum InternalErrorErrorCode {
  DEFAULT_INTERNAL_ERROR = 500_07_000,
  NOVA_WALLET_ENV_VARIABLES_NOT_SET = 500_07_001,
}

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  SPORRAN_SESSION = 'SPORRAN_SESSION',
  IDENTITY_VERIFICATION = 'identity-verification',
}

export enum AuthAppErrors {
  IDENTITY_EMAIL_IS_ALREADY_ATTESTED = 'Email already attested',
}

export enum ApillonSupportedCTypes {
  EMAIL = 'EMAIL',
  DOMAIN_LINKAGE = 'DOMAIN_LINKAGE',
}
