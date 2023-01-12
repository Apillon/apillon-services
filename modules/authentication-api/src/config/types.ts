import {
  KiltKeyringPair,
  VerificationKeyRelationship,
  DidUri,
  NewDidEncryptionKey,
} from '@kiltprotocol/types';

export enum DbTables {
  IDENTITY = 'identity',
}

export const KILT_DERIVATION_SIGN_ALGORITHM = 'sr25519';
export enum EclipticDerivationPaths {
  ATTESTATION = '//attestation',
  DELEGATION = '//delegation',
}

/**
 * Validation error codes - 42207000.
 */
export enum AuthenticationErrorCode {
  // TODO: Review correct code order (in the end)
  DEFAULT_VALIDATION_ERROR = 42207000,
  // This is the same as the error codes from the console-api
  USER_EMAIL_ALREADY_TAKEN = 422070001,
  USER_EMAIL_NOT_PRESENT = 422070002,
  USER_EMAIL_NOT_VALID = 422070003,
  IDENTITY_EMAIL_NOT_PRESENT = 422070100,
  IDENTITY_DOES_NOT_EXIST = 422070101,
  IDENTITY_STATE_NOT_PRESENT = 422070102,
  IDENTITY_INVALID_VERIFICATION_TOKEN = 422070103,
  IDENTITY_VERIFICATION_FAILED = 422070104,
  IDENTITY_TOKEN_NOT_PRESENT = 422070105,
  IDENTITY_INVALID_STATE = 422070106,
  IDENTITY_INVALID_REQUEST = 422070107,
  IDENTITY_MNEMONIC_NOT_PRESENT = 422070108,
  IDENTITY_DID_URI_NOT_PRESENT = 422070109,
  IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT = 422070110,
  IDENTITY_CREATE_INVALID_REQUEST = 422070111,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 422070112,
  IDENTITY_CREATE_SENDER_KEY_NOT_PRESENT = 422070113,
  DID_URI_NOT_PRESENT = 422070200,
  DID_URI_INVALID = 422070201,
  VERIFICATION_IDENTITY_NOT_PRESENT = 422070300,
  VERIFICATION_CHALLENGE_NOT_PRESENT = 422070301,
  VERIFICATION_INVALID_CHALLENGE = 422070302,
}

/**
 * Resource not found error codes - 40407000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404070000,
}

export enum IdentityState {
  IDENTITY_VERIFIED = 'identity-verified',
  IN_PROGRESS = 'in-progress',
  ATTESTED = 'attested',
  PENDING_VERIFICATION = 'pending-verification',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
}

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  IDENTITY_EMAIL_VERIFICATION = 'IDENTITY_EMAIL_VERIFICATION',
}

export enum IdentityEventType {
  CREATE_DECENTRALIZED_IDENTITY = 'create-decentralized-identity',
}

/************************************************************
 * Kilt types
 ************************************************************/
export interface Presentation {
  // TODO: REVIREW
  claim: any;
  legitimations: any;
  claimHashes: any;
  claimNonceMap: any;
  rootHash: any;
  delegationId: any;
  claimerSignature: unknown;
}

export interface Keypairs {
  authentication: KiltKeyringPair;
  encryption: NewDidEncryptionKey;
  assertion: KiltKeyringPair;
  delegation: KiltKeyringPair;
}

export interface SignRequestData {
  /**
   * Data to be signed.
   */
  data: Uint8Array;
  /**
   * The did key relationship to be used.
   */
  keyRelationship: VerificationKeyRelationship;
  /**
   * The DID to be used for signing.
   */
  did: DidUri;
}

export enum AuthAppErrors {
  EMAIL_ALREADY_ATTESTED = 'Email already attested',
}
