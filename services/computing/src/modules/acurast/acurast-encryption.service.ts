import { ec } from 'elliptic';
import * as crypto from 'crypto';
import {
  EncKeyCurve,
  EncryptedEnvVar,
  EncryptedValue,
  JobEnvVar,
  JobPublicKey,
  ProcessorEncryptionKey,
} from './acurast-types';

/**
 * A service that handles encryption of environment variables using ECDH key exchange.
 */
export class AcurastEncryptionService {
  /**
   * Encrypts a list of environment variables using public keys for encryption.
   * @param {JobEnvVar[]} variables - The environment variables to encrypt.
   * @param {JobPublicKey[]} publicKeys - The public keys of the job processors.
   * @returns {Promise<EncryptedEnvVar[]>} - A promise that resolves to an array of encrypted environment variables.
   */
  public async encryptEnvironmentVariables(
    variables: JobEnvVar[],
    publicKeys: JobPublicKey[],
  ): Promise<EncryptedEnvVar[]> {
    const processorEncryptionKey = this.getProcessorEncryptionKey(publicKeys);
    const sharedKey = await this.generateSharedKey(
      processorEncryptionKey.publicKey,
      processorEncryptionKey.curve,
    );

    return variables.map((envVar: JobEnvVar) => ({
      key: envVar.key,
      encryptedValue: this.encrypt(envVar.value, sharedKey),
    }));
  }

  /**
   * Finds and returns the processor encryption key based on the provided public keys.
   * @param {JobPublicKey[]} publicKeys - The public keys of the job processors.
   * @returns {ProcessorEncryptionKey | undefined} - The encryption key and curve used by the processor.
   */
  private getProcessorEncryptionKey(
    publicKeys: JobPublicKey[],
  ): ProcessorEncryptionKey | undefined {
    const key =
      this.findProcessorEncryptionKey(publicKeys, [
        'secp256r1Encryption',
        'p256',
      ]) ||
      this.findProcessorEncryptionKey(publicKeys, [
        'secp256k1encryption',
        'secp256k1',
      ]) ||
      // backwards compatibility
      this.findProcessorEncryptionKey(publicKeys, ['secp256r1', 'p256']);

    return { ...key, publicKey: key.publicKey.replace('0x', '') };
  }

  /**
   * Finds a specific processor encryption key based on the provided public keys and key type.
   * @param {JobPublicKey[]} publicKeys - The public keys of the job processors.
   * @param {[keyof JobPublicKey, EncKeyCurve]} keyType - The key type to search for in the public keys.
   * @returns {ProcessorEncryptionKey | undefined} - The encryption key object or undefined if not found.
   */
  private findProcessorEncryptionKey(
    publicKeys: JobPublicKey[],
    keyType: [keyof JobPublicKey, EncKeyCurve],
  ): ProcessorEncryptionKey | undefined {
    const keyObj = publicKeys.find((keyObj) => keyObj[keyType[0]]);
    return { publicKey: keyObj[keyType[0]]!, curve: keyType[1] };
  }

  /**
   * Generates the shared secret using ECDH key exchange between the processor's public key and the generated key pair.
   * @param {string} processorPublicKeyHex - The processor's public key in hex format.
   * @param {EncKeyCurve} curve - The elliptic curve to use for ECDH.
   * @returns {Promise<string>} - A promise that resolves to the shared secret as a hex string.
   */
  private async generateSharedSecret(
    processorPublicKeyHex: string,
    curve: EncKeyCurve,
  ): Promise<string> {
    const EC = new ec(curve);

    const keyPair = EC.genKeyPair();

    const processorKey = EC.keyFromPublic(processorPublicKeyHex, 'hex');
    // Compute the shared secret ECDH
    const sharedSecret = keyPair.derive(processorKey.getPublic());

    // Convert the shared secret to a hex string (with proper padding)
    return Buffer.from(sharedSecret.toArray()).toString('hex');
  }

  /**
   * Generates a shared key using the shared secret and elliptic curve public keys.
   * @param {string} processorPublicKeyHex - The processor's public key in hex format.
   * @param {EncKeyCurve} curve - The elliptic curve used for the key exchange.
   * @returns {Promise<Buffer>} - A promise that resolves to the derived shared key.
   */
  private async generateSharedKey(
    processorPublicKeyHex: string,
    curve: EncKeyCurve,
  ) {
    const sharedSecret = Buffer.from(
      await this.generateSharedSecret(processorPublicKeyHex, curve),
      'hex',
    );
    const sharedSecretSalt = Buffer.alloc(16); // Empty 16-byte array for secret salt

    const EC = new ec(curve);

    const keyPair = EC.genKeyPair();

    const publicKey = Buffer.from(keyPair.getPublic(true, 'hex'), 'hex');
    const processorPublicKey = Buffer.from(processorPublicKeyHex, 'hex');

    // Sort the public keys
    const publicKeys = [publicKey, processorPublicKey].sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      } else {
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            return a[i] - b[i];
          }
        }
        return 0;
      }
    });

    const sharedCurveName =
      curve === 'p256' ? 'secp256r1' : curve === 'secp256k1' ? 'secp256k1' : '';

    const info = Buffer.concat([
      Buffer.from(`ECDH ${sharedCurveName} AES-256-GCM-SIV`, 'utf-8'),
      ...publicKeys,
    ]);

    const derivedKey = await this.hkdf(
      sharedSecret,
      sharedSecretSalt,
      info,
      32,
    );

    return Buffer.from(derivedKey);
  }

  /**
   * Generates a derived key using the HKDF key derivation function.
   * @param {Buffer} keyMaterial - The key material to derive the key from.
   * @param {Uint8Array} salt - A salt value to use in HKDF.
   * @param {Uint8Array} info - Optional context and application-specific information.
   * @param {number} length - The length of the derived key in bytes.
   * @returns {Promise<ArrayBuffer>} - A promise that resolves to the derived key.
   */
  private async hkdf(
    keyMaterial: Buffer,
    salt: Uint8Array,
    info: Uint8Array,
    length: number,
  ): Promise<ArrayBuffer> {
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );
    return await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        salt,
        info,
        hash: 'SHA-256',
      },
      key,
      length * 8,
    );
  }

  /**
   * Encrypts a string using AES-256-GCM with a provided key.
   * @param {string} data - The data to encrypt.
   * @param {Buffer} key - The key to use for encryption.
   * @returns {EncryptedValue} - The encrypted data, including the ciphertext, IV, and authentication tag.
   */
  private encrypt(data: any, key: Buffer): EncryptedValue {
    const iv = crypto.randomBytes(12); // IV for AES-GCM should be 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(`${data}`, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }
}
