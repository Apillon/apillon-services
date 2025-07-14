import { AWS_KMS } from './aws-kms';

export class EncryptionService {
  private readonly kmsClient: AWS_KMS;
  private readonly keyId: string;

  constructor(kmsClient: AWS_KMS, keyId: string) {
    this.kmsClient = kmsClient;
    this.keyId = keyId;
  }

  async encrypt(data: string): Promise<string | undefined> {
    return this.kmsClient.encrypt(data, this.keyId);
  }

  async decrypt(encryptedData: string): Promise<string | undefined> {
    return this.kmsClient.decrypt(encryptedData, this.keyId);
  }

  async encryptJson(
    data: any[] | { [key: string]: any },
  ): Promise<string | undefined> {
    return this.kmsClient.encrypt(JSON.stringify(data), this.keyId);
  }

  async decryptJson<T>(encryptedData: string): Promise<T> {
    return JSON.parse(await this.kmsClient.decrypt(encryptedData, this.keyId));
  }

  // Optional: Method to rotate key if needed
  async rotateKey(): Promise<string> {
    const newKeyId = await this.kmsClient.generateEncryptionKey();
    if (!newKeyId) {
      throw new Error('Failed to generate new encryption key');
    }
    return newKeyId;
  }
}
