import * as aws from 'aws-sdk';
import { env } from '../../config/env';
import { safeJsonParse } from '../utils';

/**
 * Returns AWS secrets client.
 * Permission will be checked against execution role (of lambda)
 */
function createClient() {
  return new aws.SecretsManager({
    region: env.AWS_REGION,
  });
}

export async function getSecrets(): Promise<any> {
  return new Promise((resolve, reject) => {
    createClient().getSecretValue(
      { SecretId: env.AWS_SECRETS_ID },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          if ('SecretString' in data) {
            resolve(safeJsonParse(data.SecretString));
          } else {
            const buff = Buffer.from(data.SecretBinary as string, 'base64');
            resolve(buff.toString('ascii'));
          }
        }
      },
    );
  });
}
