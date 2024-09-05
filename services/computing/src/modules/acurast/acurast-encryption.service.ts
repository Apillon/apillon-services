import { ec } from 'elliptic';
import * as crypto from 'crypto';

export interface EnvVar {
  key: string;
  value: string;
}

interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface EnvVarEncrypted {
  key: string;
  encryptedValue: EncryptedValue;
}

type EncKeyCurve = 'p256' | 'secp256k1';

export class AcurastEncryptionService {
  /**
   * Encrypts a list of environment variables using the processor's public key.
   * @param publicKey - The processor's public key used for encryption.
   * @param variables - The list of environment variables to encrypt.
   * @returns A promise that resolves to the encrypted environment variables.
   */
  public async encryptEnvironmentVariables(
    publicKey: string,
    variables: EnvVar[],
  ): Promise<EnvVarEncrypted[]> {
    // Generate the shared key based on the processor's public key
    const sharedEncryptionKey = await this.generateSharedEncryptionKey(
      publicKey.replace('0x', ''), // Strip the '0x' prefix from the key
      'secp256k1', // Use the secp256k1 elliptic curve for key generation
    );

    // Encrypt each environment variable and return the results
    return variables.map((envVar: EnvVar) => ({
      key: envVar.key,
      encryptedValue: this.encryptWithAesGcm(envVar.value, sharedEncryptionKey),
    }));
  }

  /**
   * Derives a key using the HKDF (HMAC-based Key Derivation Function) algorithm.
   * @param keyMaterial - The input keying material (IKM) used as input to HKDF.
   * @param salt - A non-secret random value.
   * @param info - Optional context and application-specific information.
   * @param length - The desired length of the derived key in bytes.
   * @returns A promise that resolves to the derived key.
   */
  private async deriveKeyUsingHkdf(
    keyMaterial: Buffer,
    salt: Uint8Array,
    info: Uint8Array,
    length: number,
  ): Promise<ArrayBuffer> {
    // Import the key material into the SubtleCrypto API
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );

    // Derive a new key of the specified length using the imported key, salt, and info
    return await crypto.subtle.deriveBits(
      { name: 'HKDF', salt, info, hash: 'SHA-256' },
      importedKey,
      length * 8, // Length is specified in bits
    );
  }

  /**
   * Encrypts a given plaintext string using AES-256-GCM encryption.
   * @param data - The plaintext string to encrypt.
   * @param encryptionKey - The encryption key to use for AES-GCM.
   * @returns The encrypted value, IV, and authentication tag.
   */
  private encryptWithAesGcm(data: any, encryptionKey: Buffer): EncryptedValue {
    const initializationVector = crypto.randomBytes(12); // IV for AES-GCM should be 12 bytes long
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      encryptionKey,
      initializationVector,
    );

    // Encrypt the data in UTF-8 format and output it as a hexadecimal string
    let encryptedData = cipher.update(`${data}`, 'utf8', 'hex');
    encryptedData += cipher.final('hex');

    return {
      ciphertext: encryptedData,
      iv: initializationVector.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  /**
   * Generates a shared secret using ECDH (Elliptic Curve Diffie-Hellman) for key exchange.
   * @param processorPublicKeyHex - The processor's public key in hex format.
   * @param curveName - The elliptic curve name used for ECDH (e.g., secp256k1).
   * @returns A promise that resolves to the shared secret in hex format.
   */
  private async generateSharedSecret(
    processorPublicKeyHex: string,
    curveName: EncKeyCurve,
  ): Promise<string> {
    // Create an elliptic curve instance
    const ellipticCurve = new ec(curveName);

    // Generate a new key pair
    const keyPair = ellipticCurve.genKeyPair();

    // Get the processor's public key from its hex representation
    const processorPublicKey = ellipticCurve.keyFromPublic(
      processorPublicKeyHex,
      'hex',
    );

    // Derive the shared secret using ECDH
    const sharedSecret = keyPair.derive(processorPublicKey.getPublic());

    // Convert the shared secret to a hex string
    return Buffer.from(sharedSecret.toArray()).toString('hex');
  }

  /**
   * Generates a shared encryption key using ECDH and HKDF.
   * @param processorPublicKeyHex - The processor's public key in hex format.
   * @param curveName - The elliptic curve name used for ECDH.
   * @returns A promise that resolves to the derived AES encryption key.
   */
  private async generateSharedEncryptionKey(
    processorPublicKeyHex: string,
    curveName: EncKeyCurve,
  ): Promise<Buffer> {
    // Generate the shared secret using ECDH
    const sharedSecretHex = await this.generateSharedSecret(
      processorPublicKeyHex,
      curveName,
    );
    const sharedSecret = Buffer.from(sharedSecretHex, 'hex');
    const emptySalt = Buffer.alloc(16); // Use an empty 16-byte array as salt

    // Generate a new key pair for key exchange
    const localKeyPair = new ec(curveName).genKeyPair();

    // Get the public key of the local key pair in compressed format
    const localPublicKey = Buffer.from(
      localKeyPair.getPublic(true, 'hex'),
      'hex',
    );
    const processorPublicKey = Buffer.from(processorPublicKeyHex, 'hex');

    // Sort the public keys to ensure a consistent order between both parties
    const sortedPublicKeys = [localPublicKey, processorPublicKey].sort(
      (a, b) => {
        if (a.length !== b.length) {
          return a.length - b.length;
        }
        // If they are the same length, compare byte by byte
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            return a[i] - b[i];
          }
        }
        return 0;
      },
    );

    // Info used for HKDF to tie the shared secret to the specific curve and algorithm
    const hkdfInfo = Buffer.concat([
      Buffer.from(`ECDH secp256k1 AES-256-GCM-SIV`, 'utf-8'),
      ...sortedPublicKeys,
    ]);

    // Derive the final encryption key using HKDF
    return Buffer.from(
      await this.deriveKeyUsingHkdf(sharedSecret, emptySalt, hkdfInfo, 32),
    );
  }
}
