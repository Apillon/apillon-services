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

export class AcurastEncryptionService {
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

  private findProcessorEncryptionKey(
    publicKeys: JobPublicKey[],
    keyType: [keyof JobPublicKey, EncKeyCurve],
  ): ProcessorEncryptionKey | undefined {
    const keyObj = publicKeys.find((keyObj) => keyObj[keyType[0]]);
    return { publicKey: keyObj[keyType[0]]!, curve: keyType[1] };
  }

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

  private async generateSharedKey(
    processorPublicKeyHex: string,
    curve: EncKeyCurve,
  ) {
    const sharedSecret = Buffer.from(
      await this.generateSharedSecret(processorPublicKeyHex, curve),
      'hex',
    );
    const sharedSecretSalt = Buffer.alloc(16); //empty 16 byte array for secred salt

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

  private encrypt(data: string, key: Buffer): EncryptedValue {
    const iv = crypto.randomBytes(12); // iv for AES-GCM should be 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }
}
