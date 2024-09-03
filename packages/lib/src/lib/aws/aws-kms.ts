import {
  CreateKeyCommand,
  DecryptCommand,
  EncryptCommand,
  KMSClient,
} from '@aws-sdk/client-kms';
import { env } from '../../config/env';

export class AWS_KMS {
  private kmsClient: KMSClient;
  private textEncoder: TextEncoder;
  private textDecoder: TextDecoder;

  constructor() {
    this.textEncoder = new TextEncoder();
    this.textDecoder = new TextDecoder();

    try {
      this.kmsClient = new KMSClient(
        env.AWS_KEY && env.AWS_SECRET
          ? {
              region: env.AWS_REGION,
              credentials: {
                accessKeyId: env.AWS_KEY,
                secretAccessKey: env.AWS_SECRET,
              },
            }
          : { region: env.AWS_REGION },
      );
    } catch (err) {
      console.error(
        'error creating AWS KMS client',
        {
          params: {
            reg: env.AWS_REGION,
            endpoint: env.AWS_ENDPOINT,
            env: env.APP_ENV,
          },
        },
        err,
      );
      throw err;
    }
  }

  async generateEncryptionKey() {
    const response = await this.kmsClient.send(
      new CreateKeyCommand({
        KeyUsage: 'ENCRYPT_DECRYPT',
      }),
    );

    return response.KeyMetadata?.KeyId;
  }

  async encrypt(data: string, keyId: string) {
    const response = await this.kmsClient.send(
      new EncryptCommand({
        KeyId: keyId,
        Plaintext: this.textEncoder.encode(data),
      }),
    );

    if (!response.CiphertextBlob) {
      console.warn('No encryption result was returned');
      return;
    }

    return Buffer.from(response.CiphertextBlob).toString('base64');
  }

  async decrypt(data: string, keyId: string) {
    const buffer = Buffer.from(data, 'base64');

    const decryptionResponse = await this.kmsClient.send(
      new DecryptCommand({
        KeyId: keyId,
        CiphertextBlob: new Uint8Array(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength,
        ),
      }),
    );

    if (!decryptionResponse.Plaintext) {
      console.warn('No decryption result was returned');
      return;
    }

    return this.textDecoder.decode(decryptionResponse.Plaintext);
  }
}
