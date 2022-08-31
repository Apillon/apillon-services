import { getSecrets } from '../lib/aws-secrets';
import * as dotenv from 'dotenv';

export interface IEnv {
  AWS_REGION: string;
  AWS_SECRETS_ID: string;
  AT_AMS_FUNCTION_NAME: string;
}

dotenv.config();

export let env: IEnv = {
  AWS_REGION: process.env['AWS_REGION'],
  AWS_SECRETS_ID: process.env['AWS_SECRETS_ID'] || '',
  AT_AMS_FUNCTION_NAME: process.env['AT_AMS_FUNCTION_NAME'],
};

export let isEnvReady = false;

/**
 * Should be used for retrieving environment variables from AWS secret manager.
 * @returns IEnv dictionary
 */
export async function getEnvSecrets() {
  if (!isEnvReady) {
    await populateSecrets();
  }
  return env;
}

/**
 * Will overwrite secrets from AWS secrets manager if access is granted.
 * Otherwise env variables will stay the same.
 */
async function populateSecrets() {
  if (!env.AWS_SECRETS_ID) {
    isEnvReady = true;
    return;
  }
  try {
    const secrets = await getSecrets();
    env = { ...env, ...secrets };
  } catch (err) {
    console.error('ERROR populating env secretes!');
    console.error(err);
  }
  isEnvReady = true;
}

populateSecrets()
  .then(() => {
    console.log('SDK: Environment is ready!');
  })
  .catch((err) => {
    console.error('SDK: Error preparing environment!', err);
  });
