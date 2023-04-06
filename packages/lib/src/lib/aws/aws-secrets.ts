import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { env } from '../../config/env';
import { safeJsonParse } from '../utils';

/**
 * Returns AWS secrets client.
 * Permission will be checked against execution role (of lambda)
 */
function createClient() {
  return new SecretsManagerClient({
    region: env.AWS_REGION,
  });
  // return new aws.SecretsManager({
  //   region: env.AWS_REGION,
  // });
}

export async function getSecrets(id: string): Promise<any> {
  const command = new GetSecretValueCommand({
    SecretId: id,
  });
  const response = await createClient().send(command);
  return safeJsonParse(response.SecretString);
}
