export interface JobEnvVar {
  key: string;
  value: string;
}

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface EncryptedEnvVar {
  key: string;
  encryptedValue: EncryptedValue;
}

export type JobPublicKey = {
  secp256r1?: string;
  secp256k1?: string;
  ED25519?: string;
  secp256r1Encryption?: string;
  secp256k1encryption?: string;
};

export type EncKeyCurve = 'p256' | 'secp256k1';

export type ProcessorEncryptionKey = {
  publicKey: string;
  curve: EncKeyCurve;
};
