import { getSecrets } from '../lib/aws/aws-secrets';
import * as dotenv from 'dotenv';
import { AppEnvironment } from './types';

export interface IEnv {
  /**
   * runtime environment
   */
  APP_ENV: string;
  LOG_TARGET: string;

  /**
   * env var from lambda - current region - can not be overwritten in lambda settings!
   */
  AWS_REGION: string;
  /**
   * Name of the secret from secret manager
   */
  AWS_SECRETS_ID: string;

  AWS_KEY: string;
  AWS_BUCKET: string;
  AWS_ENDPOINT: string;
  AWS_SECRET: string;

  /*************************************************************
   * AMS -Authtrail Access Management Service
   *************************************************************/
  /**
   *  function name
   */
  AT_AMS_FUNCTION_NAME: string;

  /**
   * AMS dev server port
   */
  AT_AMS_SOCKET_PORT: number;

  /**
   * AMS Database config
   */

  AT_AMS_MYSQL_HOST: string;
  AT_AMS_MYSQL_PORT: number;
  AT_AMS_MYSQL_DATABASE: string;
  AT_AMS_MYSQL_USER: string;
  AT_AMS_MYSQL_PASSWORD: string;

  /************************************************************
   * LMAS -  Authtrail Logging, Monitoring & Alerting Service
   ************************************************************/
  /**
   *  function name
   */
  AT_LMAS_FUNCTION_NAME: string;
  /**
   * LMAS dev server port
   */
  AT_LMAS_SOCKET_PORT: number;
  /**
   * LMAS MongoDB connection string
   */
  AT_LMAS_MONGO_SRV: string;
  AT_LMAS_MONGO_DATABASE: string;

  /************************************************************
   * dev-console-api Database sconfig
   ************************************************************/
  AT_DEV_CONSOLE_API_MYSQL_HOST: string;
  AT_DEV_CONSOLE_API_MYSQL_PORT: number;
  AT_DEV_CONSOLE_API_MYSQL_USER: string;
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD: string;
  AT_DEV_CONSOLE_API_DB: string;
}

// dotenv.config();
dotenv.config({ path: '../../.env' });

export let env: IEnv = {
  APP_ENV: process.env['APP_ENV'] || AppEnvironment.STG,
  LOG_TARGET: process.env['LOG_TARGET'] || 'console',
  AWS_REGION: process.env['AWS_REGION'], // env var from lambda - can not be overwritten in lambda setting!
  AWS_SECRETS_ID: process.env['AWS_SECRETS_ID'] || '',
  AWS_KEY: process.env['AWS_KEY'],
  AWS_SECRET: process.env['AWS_SECRET'],
  AWS_BUCKET: process.env['AWS_BUCKET'],
  AWS_ENDPOINT: process.env['AWS_ENDPOINT'],

  /** AMS */
  AT_AMS_FUNCTION_NAME: process.env['AT_AMS_FUNCTION_NAME'],
  AT_AMS_SOCKET_PORT: parseInt(process.env['AT_AMS_SOCKET_PORT']) || 6101,
  AT_AMS_MYSQL_HOST: process.env['AT_AMS_MYSQL_HOST'],
  AT_AMS_MYSQL_PORT: parseInt(process.env['AT_AMS_MYSQL_PORT']) || 3306,
  AT_AMS_MYSQL_DATABASE: process.env['AT_AMS_MYSQL_DATABASE'],
  AT_AMS_MYSQL_USER: process.env['AT_AMS_MYSQL_USER'],
  AT_AMS_MYSQL_PASSWORD: process.env['AT_AMS_MYSQL_PASSWORD'],
  /** LMAS */
  AT_LMAS_FUNCTION_NAME: process.env['AT_LMAS_FUNCTION_NAME'],
  AT_LMAS_SOCKET_PORT: parseInt(process.env['AT_AMS_SOCKET_PORT']) || 6201,
  AT_LMAS_MONGO_SRV: process.env['AT_LMAS_MONGO_SRV'],
  AT_LMAS_MONGO_DATABASE: process.env['AT_LMAS_MONGO_DATABASE'] || 'authtrail_logs',

  AT_DEV_CONSOLE_API_MYSQL_HOST: process.env['AT_DEV_CONSOLE_API_MYSQL_HOST'],
  AT_DEV_CONSOLE_API_MYSQL_PORT: parseInt(process.env['AT_DEV_CONSOLE_API_MYSQL_PORT']) || 3306,
  AT_DEV_CONSOLE_API_MYSQL_USER: process.env['AT_DEV_CONSOLE_API_MYSQL_USER'],
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD: process.env['AT_DEV_CONSOLE_API_MYSQL_PASSWORD'],
  AT_DEV_CONSOLE_API_DB: process.env['AT_DEV_CONSOLE_API_DB'],
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
