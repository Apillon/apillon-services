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
   * AMS -Apillon Access Management Service
   *************************************************************/
  /**
   *  function name
   */
  ACCESS_FUNCTION_NAME: string;
  ACCESS_FUNCTION_NAME_TEST: string;

  /**
   * AMS dev server port
   */
  ACCESS_SOCKET_PORT: number;
  ACCESS_SOCKET_PORT_TEST: number;

  /**
   * AMS Database config
   */

  ACCESS_MYSQL_HOST: string;
  ACCESS_MYSQL_PORT: number;
  ACCESS_MYSQL_DATABASE: string;
  ACCESS_MYSQL_USER: string;
  ACCESS_MYSQL_PASSWORD: string;

  ACCESS_MYSQL_HOST_TEST: string;
  ACCESS_MYSQL_PORT_TEST: number;
  ACCESS_MYSQL_DATABASE_TEST: string;
  ACCESS_MYSQL_USER_TEST: string;
  ACCESS_MYSQL_PASSWORD_TEST: string;

  /************************************************************
   * LMAS -  Apillon Logging, Monitoring & Alerting Service
   ************************************************************/
  /**
   *  function name
   */
  MONITORING_FUNCTION_NAME: string;
  MONITORING_FUNCTION_NAME_TEST: string;
  /**
   * LMAS dev server port
   */
  MONITORING_SOCKET_PORT: number;
  MONITORING_SOCKET_PORT_TEST: number;
  /**
   * LMAS MongoDB connection string
   */
  MONITORING_MONGO_SRV: string;
  MONITORING_MONGO_DATABASE: string;
  MONITORING_MONGO_SRV_TEST: string;
  MONITORING_MONGO_DATABASE_TEST: string;

  /************************************************************
   * MAIL - mailing service
   ************************************************************/

  /**
   *  function name
   */
  MAIL_FUNCTION_NAME: string;
  MAIL_FUNCTION_NAME_TEST: string;
  /**
   * LMAS dev server port
   */
  MAIL_SOCKET_PORT: number;
  MAIL_SOCKET_PORT_TEST: number;
  /**/

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

  /************************************************************
   * dev-console-api Database config
   ************************************************************/
  DEV_CONSOLE_API_MYSQL_HOST: string;
  DEV_CONSOLE_API_MYSQL_PORT: number;
  DEV_CONSOLE_API_MYSQL_USER: string;
  DEV_CONSOLE_API_MYSQL_PASSWORD: string;
  DEV_CONSOLE_API_MYSQL_DATABASE: string;

  DEV_CONSOLE_API_MYSQL_HOST_TEST: string;
  DEV_CONSOLE_API_MYSQL_PORT_TEST: number;
  DEV_CONSOLE_API_MYSQL_USER_TEST: string;
  DEV_CONSOLE_API_MYSQL_PASSWORD_TEST: string;
  DEV_CONSOLE_API_MYSQL_DATABASE_TEST: string;

  DEV_CONSOLE_API_HOST: string;
  DEV_CONSOLE_API_PORT: number;

  DEV_CONSOLE_API_HOST_TEST: string;
  DEV_CONSOLE_API_PORT_TEST: number;

  /**
   * Page size used in sql utils
   */
  DEFAULT_PAGE_SIZE: number;

  /************************************************************
   * AT-STORAGE config
   ************************************************************/
  STORAGE_FUNCTION_NAME: string;
  STORAGE_FUNCTION_NAME_TEST: string;
  STORAGE_SOCKET_PORT: number;
  STORAGE_SOCKET_PORT_TEST: number;
  STORAGE_CRUST_SEED_PHRASE: string;
  STORAGE_AWS_IPFS_QUEUE_BUCKET: string;
  STORAGE_IPFS_GATEWAY: string;

  STORAGE_MYSQL_HOST: string;
  STORAGE_MYSQL_PORT: number;
  STORAGE_MYSQL_USER: string;
  STORAGE_MYSQL_PASSWORD: string;
  STORAGE_MYSQL_DATABASE: string;

  STORAGE_MYSQL_HOST_TEST: string;
  STORAGE_MYSQL_PORT_TEST: number;
  STORAGE_MYSQL_USER_TEST: string;
  STORAGE_MYSQL_PASSWORD_TEST: string;
  STORAGE_MYSQL_DATABASE_TEST: string;

  /************************************************************
   * Apillon API config
   ************************************************************/
  APILLON_API_HOST: string;
  APILLON_API_PORT: number;

  APILLON_API_HOST_TEST: string;
  APILLON_API_PORT_TEST: number;

  /************************************************************
   * Apillon Authroization API config
   ************************************************************/
  APILLON_AUTHORIZATION_API_HOST: string;
  APILLON_AUTHORIZATION_API_PORT: number;

  APILLON_AUTHORIZATION_API_HOST_TEST: string;
  APILLON_AUTHORIZATION_API_PORT_TEST: number;
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
  ACCESS_FUNCTION_NAME: process.env['ACCESS_FUNCTION_NAME'],
  ACCESS_FUNCTION_NAME_TEST: process.env['ACCESS_FUNCTION_NAME_TEST'],
  ACCESS_SOCKET_PORT: parseInt(process.env['ACCESS_SOCKET_PORT']) || 6102,
  ACCESS_MYSQL_HOST: process.env['ACCESS_MYSQL_HOST'],
  ACCESS_MYSQL_PORT: parseInt(process.env['ACCESS_MYSQL_PORT']) || 3306,
  ACCESS_MYSQL_DATABASE: process.env['ACCESS_MYSQL_DATABASE'],
  ACCESS_MYSQL_USER: process.env['ACCESS_MYSQL_USER'],
  ACCESS_MYSQL_PASSWORD: process.env['ACCESS_MYSQL_PASSWORD'],

  ACCESS_SOCKET_PORT_TEST:
    parseInt(process.env['ACCESS_SOCKET_PORT_TEST']) || 7101,
  ACCESS_MYSQL_HOST_TEST: process.env['ACCESS_MYSQL_HOST_TEST'],
  ACCESS_MYSQL_PORT_TEST:
    parseInt(process.env['ACCESS_MYSQL_PORT_TEST']) || 3306,
  ACCESS_MYSQL_DATABASE_TEST: process.env['ACCESS_MYSQL_DATABASE_TEST'],
  ACCESS_MYSQL_USER_TEST: process.env['ACCESS_MYSQL_USER_TEST'],
  ACCESS_MYSQL_PASSWORD_TEST: process.env['ACCESS_MYSQL_PASSWORD_TEST'],

  /** LMAS */
  MONITORING_FUNCTION_NAME: process.env['MONITORING_FUNCTION_NAME'],
  MONITORING_FUNCTION_NAME_TEST: process.env['MONITORING_FUNCTION_NAME_TEST'],
  MONITORING_SOCKET_PORT:
    parseInt(process.env['MONITORING_SOCKET_PORT']) || 6201,
  MONITORING_MONGO_SRV: process.env['MONITORING_MONGO_SRV'],
  MONITORING_MONGO_DATABASE:
    process.env['MONITORING_MONGO_DATABASE'] || 'apillon_logs',

  MONITORING_SOCKET_PORT_TEST:
    parseInt(process.env['MONITORING_SOCKET_PORT_TEST']) || 7201,
  MONITORING_MONGO_SRV_TEST: process.env['MONITORING_MONGO_SRV_TEST'],
  MONITORING_MONGO_DATABASE_TEST:
    process.env['MONITORING_MONGO_DATABASE_TEST'] || 'apillon_logs_test',
  /** DEV CONSOLE API DB conn*/
  DEV_CONSOLE_API_MYSQL_HOST: process.env['DEV_CONSOLE_API_MYSQL_HOST'],
  DEV_CONSOLE_API_MYSQL_PORT:
    parseInt(process.env['DEV_CONSOLE_API_MYSQL_PORT']) || 3306,
  DEV_CONSOLE_API_MYSQL_USER: process.env['DEV_CONSOLE_API_MYSQL_USER'],
  DEV_CONSOLE_API_MYSQL_PASSWORD: process.env['DEV_CONSOLE_API_MYSQL_PASSWORD'],
  DEV_CONSOLE_API_MYSQL_DATABASE: process.env['DEV_CONSOLE_API_MYSQL_DATABASE'],
  /** DEV CONSOLE API TEST DB conn*/
  DEV_CONSOLE_API_MYSQL_HOST_TEST:
    process.env['DEV_CONSOLE_API_MYSQL_HOST_TEST'],
  DEV_CONSOLE_API_MYSQL_PORT_TEST:
    parseInt(process.env['DEV_CONSOLE_API_MYSQL_PORT_TEST']) || 3306,
  DEV_CONSOLE_API_MYSQL_USER_TEST:
    process.env['DEV_CONSOLE_API_MYSQL_USER_TEST'],
  DEV_CONSOLE_API_MYSQL_PASSWORD_TEST:
    process.env['DEV_CONSOLE_API_MYSQL_PASSWORD_TEST'],
  DEV_CONSOLE_API_MYSQL_DATABASE_TEST:
    process.env['DEV_CONSOLE_API_MYSQL_DATABASE_TEST'],

  DEV_CONSOLE_API_HOST: process.env['DEV_CONSOLE_API_HOST'] || 'localhost',
  DEV_CONSOLE_API_PORT: parseInt(process.env['DEV_CONSOLE_API_PORT']) || 6001,
  DEV_CONSOLE_API_HOST_TEST:
    process.env['DEV_CONSOLE_API_HOS_TEST'] || 'localhost',
  DEV_CONSOLE_API_PORT_TEST:
    parseInt(process.env['DEV_CONSOLE_API_PORT_TEST']) || 7001,

  /** SQL UTILS */
  DEFAULT_PAGE_SIZE: parseInt(process.env['DEFAULT_PAGE_SIZE']) || 20,

  /**STORAGE microservice */
  STORAGE_FUNCTION_NAME: process.env['STORAGE_FUNCTION_NAME'],
  STORAGE_FUNCTION_NAME_TEST: process.env['STORAGE_FUNCTION_NAME_TEST'],
  STORAGE_SOCKET_PORT: parseInt(process.env['STORAGE_SOCKET_PORT']) || 6301,
  STORAGE_SOCKET_PORT_TEST:
    parseInt(process.env['STORAGE_SOCKET_PORT_TEST']) || 7301,
  STORAGE_CRUST_SEED_PHRASE: process.env['STORAGE_CRUST_SEED_PHRASE'],
  STORAGE_AWS_IPFS_QUEUE_BUCKET: process.env['STORAGE_AWS_IPFS_QUEUE_BUCKET'],
  STORAGE_IPFS_GATEWAY: process.env['STORAGE_IPFS_GATEWAY'],

  /**STORAGE microservice - TEST DB */
  STORAGE_MYSQL_HOST: process.env['STORAGE_MYSQL_HOST'],
  STORAGE_MYSQL_PORT: parseInt(process.env['STORAGE_MYSQL_PORT']) || 3306,
  STORAGE_MYSQL_USER: process.env['STORAGE_MYSQL_USER'],
  STORAGE_MYSQL_PASSWORD: process.env['STORAGE_MYSQL_PASSWORD'],
  STORAGE_MYSQL_DATABASE: process.env['STORAGE_MYSQL_DATABASE'],

  /**STORAGE microservice - TEST DB */
  STORAGE_MYSQL_HOST_TEST: process.env['STORAGE_MYSQL_HOST_TEST'],
  STORAGE_MYSQL_PORT_TEST:
    parseInt(process.env['STORAGE_MYSQL_PORT_TEST']) || 3306,
  STORAGE_MYSQL_USER_TEST: process.env['STORAGE_MYSQL_USER_TEST'],
  STORAGE_MYSQL_PASSWORD_TEST: process.env['STORAGE_MYSQL_PASSWORD_TEST'],
  STORAGE_MYSQL_DATABASE_TEST: process.env['STORAGE_MYSQL_DATABASE_TEST'],
  /** MAILING */
  MAIL_FUNCTION_NAME: process.env['MAIL_FUNCTION_NAME'],
  MAIL_FUNCTION_NAME_TEST: process.env['MAIL_FUNCTION_NAME_TEST'],

  MAIL_SOCKET_PORT: parseInt(process.env['MAIL_SOCKET_PORT_TEST']) || 6401,
  MAIL_SOCKET_PORT_TEST: parseInt(process.env['MAIL_SOCKET_PORT_TEST']) || 7401,

  MAIL_TEMPLATE_PATH: process.env['MAIL_TEMPLATE_PATH'] || '',
  SMTP_HOST: process.env['SMTP_HOST'],
  SMTP_PORT: parseInt(process.env['SMTP_PORT']),
  SMTP_USE_SSL: process.env['SMTP_USE_SSL'] !== 'false',
  SMTP_USERNAME: process.env['SMTP_USERNAME'],
  SMTP_PASSWORD: process.env['SMTP_PASSWORD'],
  SMTP_NAME_FROM: process.env['SMTP_NAME_FROM'] || 'Apillon.io',
  SMTP_EMAIL_FROM: process.env['SMTP_EMAIL_FROM'] || 'info@apillon.io',
  ADMIN_EMAILS: process.env['ADMIN_EMAILS'] || 'info@apillon.io',

  /** APILLON API */
  APILLON_API_HOST: process.env['APILLON_API_HOST'] || 'localhost',
  APILLON_API_PORT: parseInt(process.env['APILLON_API_PORT']) || 6002,
  APILLON_API_HOST_TEST: process.env['APILLON_API_HOST_TEST'] || 'localhost',
  APILLON_API_PORT_TEST: parseInt(process.env['APILLON_API_PORT_TEST']) || 7002,

  /** APILLON AUTHROIZATION API */
  APILLON_AUTHORIZATION_API_HOST:
    process.env['APILLON_AUTHORIZATION_API_HOST'] || 'localhost',
  APILLON_AUTHORIZATION_API_PORT:
    parseInt(process.env['APILLON_AUTHORIZATION_API_PORT']) || 6003,
  APILLON_AUTHORIZATION_API_HOST_TEST:
    process.env['APILLON_AUTHORIZATION_API_HOST_TEST'] || 'localhost',
  APILLON_AUTHORIZATION_API_PORT_TEST:
    parseInt(process.env['APILLON_AUTHORIZATION_API_PORT_TEST']) || 7003,
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
