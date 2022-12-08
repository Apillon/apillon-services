export enum DbTables {}

// TODO: Move to a cache system or a database (preferably cache)
export const challenge = '123456789';

/**
 * Validation error codes - 42207000.
 */
export enum ModuleValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42207000,
  // This is the same as the error codes from the console-api
  USER_EMAIL_ALREADY_TAKEN = 422070001,
  USER_EMAIL_NOT_PRESENT = 422070002,
  USER_EMAIL_NOT_VALID = 422070003,
  ATTEST_EMAIL_NOT_PRESENT = 422070101,
  ATTEST_DOES_NOT_EXIST = 422070102,
  ATTEST_STATE_NOT_PRESENT = 422070103,
  ATTEST_INVALID_VERIFICATION_TOKEN = 422070104,
  ATTEST_INVALID_STATE = 422070105,
  ATTEST_INVALID_REQUEST = 422070106,
  ATTEST_MNEMONIC_NOT_PRESENT = 422070107,
  ATTEST_DID_URI_NOT_PRESENT = 422070108,
  IDENTITY_CREATE_INVALID_REQUEST = 422070201,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 422070202,
  IDENTITY_CREATE_SENDER_KEY_NOT_PRESENT = 422070203,
  DID_URI_NOT_PRESENT = 422070203,
  DID_URI_INVALID = 422070203,
  VERIFICATION_IDENTITY_NOT_PRESENT = 422070204,
  VERIFICATION_CHALLENGE_NOT_PRESENT = 422070205,
  VERIFICATION_INVALID_CHALLENGE = 422070206,
}

/**
 * Resource not found error codes - 40407000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404070000,
}

export enum DbTables {
  ATTESTATION = 'attestation',
}

export enum AttestationState {
  VERIFIED = 'identity-verified',
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
  ATTEST_EMAIL_VERIFICATION = 'ATTESTATION_EMAIL_VERIFICATION',
}

import {
  KiltKeyringPair,
  VerificationKeyRelationship,
  DidUri,
  NewDidEncryptionKey,
} from '@kiltprotocol/types';

export interface Presentation {
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
