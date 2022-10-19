import { getSecrets } from '../lib/aws/aws-secrets';
import * as dotenv from 'dotenv';
import { AppEnvironment } from './types';

export interface IEnv {
  /**
   * runtime environment
   */
  APP_URL: string;
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
  /**
   * Application secret.
   */
  APP_SECRET: string;

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
  AT_AMS_FUNCTION_NAME_TEST: string;

  /**
   * AMS dev server port
   */
  AT_AMS_SOCKET_PORT: number;
  AT_AMS_SOCKET_PORT_TEST: number;

  /**
   * AMS Database config
   */

  AT_AMS_MYSQL_HOST: string;
  AT_AMS_MYSQL_PORT: number;
  AT_AMS_MYSQL_DATABASE: string;
  AT_AMS_MYSQL_USER: string;
  AT_AMS_MYSQL_PASSWORD: string;

  AT_AMS_MYSQL_HOST_TEST: string;
  AT_AMS_MYSQL_PORT_TEST: number;
  AT_AMS_MYSQL_DATABASE_TEST: string;
  AT_AMS_MYSQL_USER_TEST: string;
  AT_AMS_MYSQL_PASSWORD_TEST: string;

  /************************************************************
   * LMAS -  Authtrail Logging, Monitoring & Alerting Service
   ************************************************************/
  /**
   *  function name
   */
  AT_LMAS_FUNCTION_NAME: string;
  AT_LMAS_FUNCTION_NAME_TEST: string;
  /**
   * LMAS dev server port
   */
  AT_LMAS_SOCKET_PORT: number;
  AT_LMAS_SOCKET_PORT_TEST: number;
  /**
   * LMAS MongoDB connection string
   */
  AT_LMAS_MONGO_SRV: string;
  AT_LMAS_MONGO_DATABASE: string;
  AT_LMAS_MONGO_SRV_TEST: string;
  AT_LMAS_MONGO_DATABASE_TEST: string;

  /************************************************************
   * dev-console-api Database config
   ************************************************************/
  AT_DEV_CONSOLE_API_MYSQL_HOST: string;
  AT_DEV_CONSOLE_API_MYSQL_PORT: number;
  AT_DEV_CONSOLE_API_MYSQL_USER: string;
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD: string;
  AT_DEV_CONSOLE_API_MYSQL_DATABASE: string;

  AT_DEV_CONSOLE_API_MYSQL_HOST_TEST: string;
  AT_DEV_CONSOLE_API_MYSQL_PORT_TEST: number;
  AT_DEV_CONSOLE_API_MYSQL_USER_TEST: string;
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD_TEST: string;
  AT_DEV_CONSOLE_API_MYSQL_DATABASE_TEST: string;

  AT_DEV_CONSOLE_API_HOST: string;
  AT_DEV_CONSOLE_API_PORT: number;

  AT_DEV_CONSOLE_API_HOST_TEST: string;
  AT_DEV_CONSOLE_API_PORT_TEST: number;

  /**
   * Page size used in sql utils
   */
  DEFAULT_PAGE_SIZE: number;

  /** MAILING */
  MAIL_TEMPLATE_PATH: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USE_SSL: boolean;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  SMTP_NAME_FROM: string;
  SMTP_EMAIL_FROM: string;
  ADMIN_EMAILS: string;
}

// dotenv.config();
dotenv.config({ path: '../../.env' });

export let env: IEnv = {
  APP_URL: process.env['APP_URL'] || 'https://app.apillon.io',
  APP_ENV: process.env['APP_ENV'] || AppEnvironment.STG,
  LOG_TARGET: process.env['LOG_TARGET'] || 'console',
  AWS_REGION: process.env['AWS_REGION'], // env var from lambda - can not be overwritten in lambda setting!
  AWS_SECRETS_ID: process.env['AWS_SECRETS_ID'] || '',
  AWS_KEY: process.env['AWS_KEY'],
  AWS_SECRET: process.env['AWS_SECRET'],
  AWS_BUCKET: process.env['AWS_BUCKET'],
  AWS_ENDPOINT: process.env['AWS_ENDPOINT'],
  APP_SECRET: process.env['APP_SECRET'] || 'notasecret',

  /** AMS */
  AT_AMS_FUNCTION_NAME: process.env['AT_AMS_FUNCTION_NAME'],
  AT_AMS_FUNCTION_NAME_TEST: process.env['AT_AMS_FUNCTION_NAME_TEST'],
  AT_AMS_SOCKET_PORT: parseInt(process.env['AT_AMS_SOCKET_PORT']) || 6101,
  AT_AMS_MYSQL_HOST: process.env['AT_AMS_MYSQL_HOST'],
  AT_AMS_MYSQL_PORT: parseInt(process.env['AT_AMS_MYSQL_PORT']) || 3306,
  AT_AMS_MYSQL_DATABASE: process.env['AT_AMS_MYSQL_DATABASE'],
  AT_AMS_MYSQL_USER: process.env['AT_AMS_MYSQL_USER'],
  AT_AMS_MYSQL_PASSWORD: process.env['AT_AMS_MYSQL_PASSWORD'],

  AT_AMS_SOCKET_PORT_TEST:
    parseInt(process.env['AT_AMS_SOCKET_PORT_TEST']) || 7101,
  AT_AMS_MYSQL_HOST_TEST: process.env['AT_AMS_MYSQL_HOST_TEST'],
  AT_AMS_MYSQL_PORT_TEST:
    parseInt(process.env['AT_AMS_MYSQL_PORT_TEST']) || 3306,
  AT_AMS_MYSQL_DATABASE_TEST: process.env['AT_AMS_MYSQL_DATABASE_TEST'],
  AT_AMS_MYSQL_USER_TEST: process.env['AT_AMS_MYSQL_USER_TEST'],
  AT_AMS_MYSQL_PASSWORD_TEST: process.env['AT_AMS_MYSQL_PASSWORD_TEST'],

  /** LMAS */
  AT_LMAS_FUNCTION_NAME: process.env['AT_LMAS_FUNCTION_NAME'],
  AT_LMAS_FUNCTION_NAME_TEST: process.env['AT_LMAS_FUNCTION_NAME_TEST'],
  AT_LMAS_SOCKET_PORT: parseInt(process.env['AT_LMAS_SOCKET_PORT']) || 6201,
  AT_LMAS_MONGO_SRV: process.env['AT_LMAS_MONGO_SRV'],
  AT_LMAS_MONGO_DATABASE:
    process.env['AT_LMAS_MONGO_DATABASE'] || 'authtrail_logs',

  AT_LMAS_SOCKET_PORT_TEST:
    parseInt(process.env['AT_LMAS_SOCKET_PORT_TEST']) || 7201,
  AT_LMAS_MONGO_SRV_TEST: process.env['AT_LMAS_MONGO_SRV_TEST'],
  AT_LMAS_MONGO_DATABASE_TEST:
    process.env['AT_LMAS_MONGO_DATABASE_TEST'] || 'authtrail_logs_test',

  /** DEV CONSOLE API */
  AT_DEV_CONSOLE_API_MYSQL_HOST: process.env['AT_DEV_CONSOLE_API_MYSQL_HOST'],
  AT_DEV_CONSOLE_API_MYSQL_PORT:
    parseInt(process.env['AT_DEV_CONSOLE_API_MYSQL_PORT']) || 3306,
  AT_DEV_CONSOLE_API_MYSQL_USER: process.env['AT_DEV_CONSOLE_API_MYSQL_USER'],
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD:
    process.env['AT_DEV_CONSOLE_API_MYSQL_PASSWORD'],
  AT_DEV_CONSOLE_API_MYSQL_DATABASE:
    process.env['AT_DEV_CONSOLE_API_MYSQL_DATABASE'],

  AT_DEV_CONSOLE_API_MYSQL_HOST_TEST:
    process.env['AT_DEV_CONSOLE_API_MYSQL_HOST_TEST'],
  AT_DEV_CONSOLE_API_MYSQL_PORT_TEST:
    parseInt(process.env['AT_DEV_CONSOLE_API_MYSQL_PORT_TEST']) || 3306,
  AT_DEV_CONSOLE_API_MYSQL_USER_TEST:
    process.env['AT_DEV_CONSOLE_API_MYSQL_USER_TEST'],
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD_TEST:
    process.env['AT_DEV_CONSOLE_API_MYSQL_PASSWORD_TEST'],
  AT_DEV_CONSOLE_API_MYSQL_DATABASE_TEST:
    process.env['AT_DEV_CONSOLE_API_MYSQL_DATABASE_TEST'],

  AT_DEV_CONSOLE_API_HOST:
    process.env['AT_DEV_CONSOLE_API_HOST'] || 'localhost',
  AT_DEV_CONSOLE_API_PORT:
    parseInt(process.env['AT_DEV_CONSOLE_API_PORT']) || 6001,
  AT_DEV_CONSOLE_API_HOST_TEST:
    process.env['AT_DEV_CONSOLE_API_HOS_TEST'] || 'localhost',
  AT_DEV_CONSOLE_API_PORT_TEST:
    parseInt(process.env['AT_DEV_CONSOLE_API_PORT_TEST']) || 7001,

  /** SQL UTILS */
  DEFAULT_PAGE_SIZE: parseInt(process.env['DEFAULT_PAGE_SIZE']) || 20,

  /** MAILING */
  MAIL_TEMPLATE_PATH: process.env['MAIL_TEMPLATE_PATH'] || '',
  SMTP_HOST: process.env['SMTP_HOST'],
  SMTP_PORT: parseInt(process.env['SMTP_PORT']),
  SMTP_USE_SSL: process.env['SMTP_USE_SSL'] !== 'false',
  SMTP_USERNAME: process.env['SMTP_USERNAME'],
  SMTP_PASSWORD: process.env['SMTP_PASSWORD'],
  SMTP_NAME_FROM: process.env['SMTP_NAME_FROM'] || 'Apillon.io',
  SMTP_EMAIL_FROM: process.env['SMTP_EMAIL_FROM'] || 'info@apillon.io',
  ADMIN_EMAILS: process.env['ADMIN_EMAILS'] || 'info@apillon.io',
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
  // console.log(JSON.stringify(env, null, 2));
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
