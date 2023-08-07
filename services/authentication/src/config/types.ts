import { VerificationKeyRelationship, DidUri } from '@kiltprotocol/types';
import { IPublicKeyRecord, Proof } from '@kiltprotocol/vc-export';

export enum DbTables {
  IDENTITY = 'identity',
  IDENTITY_JOB = 'identity_job',
  TRANSACTION = 'transaction',
}

/**
 * Validation error codes - 42213000.
 */
export enum AuthenticationErrorCode {
  DEFAULT_VALIDATION_ERROR = 42213000,
  USER_EMAIL_ALREADY_TAKEN = 422130001,
  USER_EMAIL_NOT_PRESENT = 422130002,
  USER_EMAIL_NOT_VALID = 422130003,
  IDENTITY_EMAIL_NOT_PRESENT = 422130100,
  IDENTITY_DOES_NOT_EXIST = 422130101,
  IDENTITY_STATE_NOT_PRESENT = 422130102,
  IDENTITY_INVALID_VERIFICATION_TOKEN = 422130103,
  IDENTITY_VERIFICATION_FAILED = 422130104,
  IDENTITY_TOKEN_NOT_PRESENT = 422130105,
  IDENTITY_INVALID_STATE = 422130106,
  IDENTITY_INVALID_REQUEST = 422130107,
  IDENTITY_MNEMONIC_NOT_PRESENT = 422130108,
  IDENTITY_DID_URI_NOT_PRESENT = 422130109,
  IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT = 422130110,
  IDENTITY_CREATE_INVALID_REQUEST = 422130111,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 422130112,
  IDENTITY_CREATE_SENDER_KEY_NOT_PRESENT = 422130113,
  IDENTITY_EMAIL_IS_ALREADY_ATTESTED = 422130114,
  IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT = 422130115,
  IDENTITY_CAPTCHA_NOT_CONFIGURED = 422130116,
  IDENTITY_CAPTCHA_INVALID = 422130117,
  IDENTITY_CAPTCHA_NOT_PRESENT = 422130118,
  DID_URI_NOT_PRESENT = 422130200,
  DID_URI_INVALID = 422130201,
  VERIFICATION_IDENTITY_NOT_PRESENT = 422130300,
  VERIFICATION_CHALLENGE_NOT_PRESENT = 422130301,
  VERIFICATION_INVALID_CHALLENGE = 422130302,
  SPORRAN_INVALID_REQUEST = 422130401,
  SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT = 422130402,
  SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT = 422130403,
  SPORRAN_NONCE_NOT_PRESENT = 422130404,
  SPORRAN_SESSIONID_NOT_PRESENT = 422130405,
  SPORRAN_VERIFIER_DID_DOES_NOT_EXIST = 422130406,
  // Sporran verifier key-agreement does not exit
  SPORRAN_VERIFIER_KA_DOES_NOT_EXIST = 422130407,
  SPORRAN_REQUEST_MESSAGE_NOT_PRESENT = 422130407,
  // Blockchain service integration
  TRANSACTION_CHAIN_ID_NOT_PRESENT = 422130501,
  TRANSACTION_TYPE_NOT_PRESENT = 422130502,
  TRANSACTION_RAW_TRANSACTION_NOT_PRESENT = 422130503,
}

/**
 * Resource not found error codes - 40413000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 404130000,
}

export enum HttpStatus {
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
}

// Well known did domain linkage Ctype required props
export const KILT_CREDENTIAL_IRI_PREFIX = 'kilt:cred:';
export const APILLON_VERIFIABLECREDENTIAL_TYPE = 'ApillonCredential2023';
export const DEFAULT_VERIFIABLECREDENTIAL_TYPE = 'VerifiableCredential';
export declare const APILLON_SELF_SIGNED_PROOF_TYPE = 'ApillonSelfSigned2020';

export const enum Attester {
  APILLON = 'Apillon',
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

export enum IdentityState {
  IN_PROGRESS = 'in-progress',
  IDENTITY_VERIFIED = 'identity-verified',
  PENDING_VERIFICATION = 'pending-verification',
  SUBMITTED_DID_CREATE_REQ = 'submitted-did-create-req',
  SUBMITTED_ATTESATION_REQ = 'submitted-attestation-req',
  SUBMITTED_REVOKE_REQ = 'submitted-revoke-req',
  DID_CREATED = 'did-created',
  ATTESTED = 'attested',
  REVOKED = 'revoked',
  REJECTED = 'rejected',
}

export enum CredentialAttestStatus {
  PENDING = 'pending',
  ATTESTED = 'attested',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
}

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  SPORRAN_SESSION = 'sporran-session',
  IDENTITY_VERIFICATION = 'identity-verification',
  USER_AUTHENTICATION = 'user-authentication',
}

export enum IdentityEventType {
  CREATE_DECENTRALIZED_IDENTITY = 'create-decentralized-identity',
}

export enum AuthApiEmailType {
  GENERATE_IDENTITY = 'generate-identity',
  RESTORE_CREDENTIAL = 'restore-credential',
  REVOKE_DID = 'revoke-did',
}

export interface Presentation {
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

// TODO: Remove identity prefix
export enum AuthAppErrors {
  IDENTITY_EMAIL_IS_ALREADY_ATTESTED = 'Email already attested',
}

export enum ApillonSupportedCTypes {
  EMAIL = 'EMAIL',
  // Internal use only!
  DOMAIN_LINKAGE = 'DOMAIN_LINKAGE',
}

export enum SporranMessageType {
  SUBMIT_TERMS = 'submit-terms',
  REQUEST_ATTESTATION = 'request-attestation',
  SUBMIT_ATTESTATION = 'submit-attestation',
  REQUEST_CREDENTIAL = 'request-credential',
}

export enum IdentityGenFlag {
  FULL_IDENTITY = 'full-identity-flag',
  ATTESTATION = 'attestation-flag',
}

export interface EncryptedPayload {
  message: string;
  payload: string;
}

export interface DidCreateOp {
  payload: EncryptedPayload;
  senderPubKey: string;
}

// SECTION
export interface ApillonSelfSignedProof extends Proof {
  type: typeof APILLON_SELF_SIGNED_PROOF_TYPE;
  proofPurpose: 'assertionMethod';
  verificationMethod: IPublicKeyRecord['id'] | IPublicKeyRecord;
  signature: string;
  challenge?: string;
}

export const APILLON_DAPP_NAME = 'ApillonDApp';

// Retry once
export const IDENTITY_JOB_MAX_RETRIES = 1;

export enum IdentityJobState {
  // State 1: DID_CREATE -> State 2: ATESTATION
  DID_CREATE = 'did-create',
  ATESTATION = 'attestation',
  // State 1: DID_REVOKE
  DID_REVOKE = 'did-revoke',
}
