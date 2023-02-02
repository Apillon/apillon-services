import {
  KiltKeyringPair,
  VerificationKeyRelationship,
  DidUri,
  NewDidEncryptionKey,
} from '@kiltprotocol/types';
import { IPublicKeyRecord, Proof } from '@kiltprotocol/vc-export';
import { Keypair } from '@polkadot/util-crypto/types';

export enum DbTables {
  IDENTITY = 'identity',
}

export const enum KiltSignAlgorithm {
  SR25519 = 'sr25519',
  ED25519 = 'ed25519',
  X25519 = 'x25519',
}
export enum KiltDerivationPaths {
  AUTHENTICATION = '//did//0',
  ASSERTION = '//did//assertion//0', // Attestation
  CAPABILITY_DELEGATION = '//did//delegation//0',
  KEY_AGREEMENT = '//did//keyAgreement//0',
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
  IDENTITY_EMAIL_IS_ALREADY_ATTESTED = 422070114,
  IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT = 422070115,
  IDENTITY_CAPTCHA_NOT_CONFIGURED = 422070116,
  IDENTITY_CAPTCHA_INVALID = 422070117,
  IDENTITY_CAPTCHA_NOT_PRESENT = 422070118,
  DID_URI_NOT_PRESENT = 422070200,
  DID_URI_INVALID = 422070201,
  VERIFICATION_IDENTITY_NOT_PRESENT = 422070300,
  VERIFICATION_CHALLENGE_NOT_PRESENT = 422070301,
  VERIFICATION_INVALID_CHALLENGE = 422070302,
  SPORRAN_INVALID_REQUEST = 422070401,
  SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT = 422070402,
  SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT = 422070403,
  SPORRAN_NONCE_NOT_PRESENT = 422070404,
  SPORRAN_SESSIONID_NOT_PRESENT = 422070405,
  SPORRAN_VERIFIER_DID_DOES_NOT_EXIST = 422070406,
  // Sporran verifier key-agreement does not exit
  SPORRAN_VERIFIER_KA_DOES_NOT_EXIST = 422070407,
}

// Well known did domain linkage Ctype required props
export const KILT_CREDENTIAL_IRI_PREFIX = 'kilt:cred:';
export const APILLON_VERIFIABLECREDENTIAL_TYPE = 'ApillonCredential2023';
export const DEFAULT_VERIFIABLECREDENTIAL_TYPE = 'VerifiableCredential';
export declare const APILLON_SELF_SIGNED_PROOF_TYPE = 'ApillonSelfSigned2020';
export interface ApillonSelfSignedProof extends Proof {
  type: typeof APILLON_SELF_SIGNED_PROOF_TYPE;
  proofPurpose: 'assertionMethod';
  verificationMethod: IPublicKeyRecord['id'] | IPublicKeyRecord;
  signature: string;
  challenge?: string;
}

// Sporran specifics
export const APILLON_DAPP_NAME = 'ApillonDApp';

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
  SPORRAN_SESSION = 'SPORRAN_SESSION',
  IDENTITY_VERIFICATION = 'identity-verification',
}

export enum IdentityEventType {
  CREATE_DECENTRALIZED_IDENTITY = 'create-decentralized-identity',
}

export enum AuthApiEmailType {
  GENERATE_IDENTITY = 'generate-identity',
  RESTORE_CREDENTIAL = 'restore-credential',
  REVOKE_DID = 'revoke-did',
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

export interface Keypairs {
  authentication: KiltKeyringPair;
  keyAgreement: NewDidEncryptionKey;
  assertion: KiltKeyringPair;
  delegation: KiltKeyringPair;
}

export enum AuthAppErrors {
  IDENTITY_EMAIL_IS_ALREADY_ATTESTED = 'Email already attested',
}

export enum ApillonSupportedCTypes {
  EMAIL = 'EMAIL',
  DOMAIN_LINKAGE = 'DOMAIN_LINKAGE',
}

export enum SporranMessageType {
  REQUEST_ATTESTATION = 'request-attestation',
  SUBMIT_ATTESTATION = 'submit-attestation',
  REQUEST_CREDENTIAL = 'request-credential',
}
