import { getSecrets } from '../lib/aws/aws-secrets';
import * as dotenv from 'dotenv';
import { AppEnvironment } from './types';

export interface IEnv {
  /**
   * runtime environment
   */
  APP_ENV: string;
  /**
   * env var from lambda - current region - can not be overwritten in lambda settings!
   */
  AWS_REGION: string;
  /**
   * Name of the secret from secret manager
   */
  AWS_SECRETS_ID: string;
  /**
   * Authtrail Access Management Service function name
   */
  AT_AMS_FUNCTION_NAME: string;
  /**
   * Authtrail Logging, Monitoring & Alerting Service function name
   */
  AT_LMAS_FUNCTION_NAME: string;

  /**
   * AMS dev server port
   */
  AT_AMS_SOCKET_PORT: number;
  /**
   * LMAS dev server port
   */
  AT_LMAS_SOCKET_PORT: number;
}

dotenv.config();
dotenv.config({ path: '../../.env' });

export let env: IEnv = {
  APP_ENV: process.env['APP_ENV'] || AppEnvironment.STG,
  AWS_REGION: process.env['AWS_REGION'], // env var from lambda - can not be overwritten in lambda setting!
  AWS_SECRETS_ID: process.env['AWS_SECRETS_ID'] || '',
  AT_AMS_FUNCTION_NAME: process.env['AT_AMS_FUNCTION_NAME'],
  AT_LMAS_FUNCTION_NAME: process.env['AT_LMAS_FUNCTION_NAME'],
  AT_AMS_SOCKET_PORT: parseInt(process.env['AT_AMS_SOCKET_PORT']) || 6101,
  AT_LMAS_SOCKET_PORT: parseInt(process.env['AT_AMS_SOCKET_PORT']) || 6201,
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
  console.log(JSON.stringify(env, null, 2));
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

// startup populate
populateSecrets()
  .then(() => {
    console.log('SDK: Environment is ready!');
  })
  .catch((err) => {
    console.error('SDK: Error preparing environment!', err);
  });
