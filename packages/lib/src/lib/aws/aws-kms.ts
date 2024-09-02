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
    const stringAsUint8Array = this.textEncoder.encode(data);

    const response = await this.kmsClient.send(
      new EncryptCommand({
        KeyId: keyId,
        Plaintext: stringAsUint8Array,
      }),
    );

    if (!response.CiphertextBlob) {
      return;
    }

    return Buffer.from(response.CiphertextBlob).toString('base64');
  }

  async decrypt(data: string, keyId: string) {
    const buffer = Buffer.from(data, 'base64');

    const uint8Array = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );

    const decryptionResponse = await this.kmsClient.send(
      new DecryptCommand({
        KeyId: keyId,
        CiphertextBlob: uint8Array,
      }),
    );

    if (!decryptionResponse.Plaintext) {
      return;
    }

    return this.textDecoder.decode(decryptionResponse.Plaintext);
  }
}
