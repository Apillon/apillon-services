export enum DbTables {}

// TODO: Move to a cache system or a database (preferably cache)
export const challenge = '123456789';

/**
 * Validation error codes - 42207000.
 */
export enum ModuleValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42207000,
  // This is the same as the error codes from the console-api
  USER_EMAIL_ALREADY_TAKEN = 42207001,
  USER_EMAIL_NOT_PRESENT = 42207002,
  USER_EMAIL_NOT_VALID = 42207003,
  ATTEST_EMAIL_NOT_PRESENT = 42207004,
  ATTEST_STATE_NOT_PRESENT = 42207005,
  ATTEST_INVALID_VERIFICATION_TOKEN = 42207006,
  ATTEST_INVALID_STATE = 42207007,
  ATTEST_INVALID_REQUEST = 42207008,
  ATTEST_MNEMONIC_NOT_PRESENT = 42207009,
  ATTEST_DID_URI_NOT_PRESENT = 42207010,
  ATTEST_DID_CREATE_EXT_NOT_PRESENT = 42207011,
  ATTEST_TX_INVALID_EXTRINSIC = 42207012,
  VERIFICATION_IDENTITY_NOT_PRESENT = 42207013,
  VERIFICATION_CHALLENGE_NOT_PRESENT = 42207014,
  VERIFICATION_INVALID_CHALLENGE = 42207015,
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
  claimerSignature: {};
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
