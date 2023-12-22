import { getSecrets } from '../lib/aws/aws-secrets';
import * as dotenv from 'dotenv';
import { AppEnvironment, CacheKeyTTL } from './types';

export interface IEnv {
  /**
   * runtime environment
   */
  APP_URL: string;
  ADMIN_APP_URL: string;
  APP_ENV: string;
  LOG_TARGET: string;
  LOG_LEVEL: string;
  CONSOLE_API_URL: string;

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
   * AMS - Apillon Access Management Service
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
  ACCESS_MYSQL_DEPLOY_USER: string;
  ACCESS_MYSQL_DEPLOY_PASSWORD: string;

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

  /**
   * SLACK ALERTS
   */
  SLACK_TOKEN: string;
  SLACK_CHANNEL: string;
  SLACK_CHANNEL_FOR_WEBSITE_REVIEWS: string;

  /**
   * MONITORING SQS
   */
  MONITORING_SQS_URL: string;

  /************************************************************
   * MAIL - Apillon Mailing Service
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
  CONTACT_EMAIL_TO: string;

  /************************************************************
   * DEV-CONSOLE-API -Apillon Developer Console API
   ************************************************************/
  DEV_CONSOLE_API_MYSQL_HOST: string;
  DEV_CONSOLE_API_MYSQL_PORT: number;
  DEV_CONSOLE_API_MYSQL_USER: string;
  DEV_CONSOLE_API_MYSQL_PASSWORD: string;
  DEV_CONSOLE_API_MYSQL_DEPLOY_USER: string;
  DEV_CONSOLE_API_MYSQL_DEPLOY_PASSWORD: string;
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
   * Project, which is used for admin panel (access to ipfs, generation of tokens ...)
   */
  DEV_CONSOLE_API_DEFAULT_PROJECT_UUID: string;

  /************************************************************
   * ADMIN-CONSOLE-API - Apillon Admin Console API
   ************************************************************/
  ADMIN_CONSOLE_API_HOST: string;
  ADMIN_CONSOLE_API_PORT: number;

  ADMIN_CONSOLE_API_HOST_TEST: string;
  ADMIN_CONSOLE_API_PORT_TEST: number;

  /**
   * Page size used in sql utils
   */
  DEFAULT_PAGE_SIZE: number;

  /************************************************************
   * Apillon Storage Service
   ************************************************************/
  STORAGE_FUNCTION_NAME: string;
  STORAGE_FUNCTION_NAME_TEST: string;
  STORAGE_SOCKET_PORT: number;
  STORAGE_SOCKET_PORT_TEST: number;
  STORAGE_CRUST_SEED_PHRASE: string;
  STORAGE_CRUST_SEED_PHRASE_TEST: string;
  STORAGE_AWS_IPFS_QUEUE_BUCKET: string;
  URL_SCREENSHOT_FUNCTION_NAME: string;
  URL_SCREENSHOT_API_URL: string;
  SEND_WEBSITES_TO_REVIEW: number;

  STORAGE_MYSQL_HOST: string;
  STORAGE_MYSQL_PORT: number;
  STORAGE_MYSQL_USER: string;
  STORAGE_MYSQL_PASSWORD: string;
  STORAGE_MYSQL_DEPLOY_USER: string;
  STORAGE_MYSQL_DEPLOY_PASSWORD: string;
  STORAGE_MYSQL_DATABASE: string;

  STORAGE_MYSQL_HOST_TEST: string;
  STORAGE_MYSQL_PORT_TEST: number;
  STORAGE_MYSQL_USER_TEST: string;
  STORAGE_MYSQL_PASSWORD_TEST: string;
  STORAGE_MYSQL_DATABASE_TEST: string;

  /************************************************************
   * Serverless workers config - STORAGE MS
   ************************************************************/
  STORAGE_AWS_WORKER_SQS_URL: string;
  STORAGE_AWS_WORKER_SQS_ARN: string;
  STORAGE_AWS_WORKER_LAMBDA_NAME: string;

  /************************************************************
   * BIS - Apillon Blockchain Integration Service
   ************************************************************/
  BLOCKCHAIN_FUNCTION_NAME: string;
  BLOCKCHAIN_FUNCTION_NAME_TEST: string;
  BLOCKCHAIN_SOCKET_PORT: number;
  BLOCKCHAIN_MYSQL_HOST: string;
  BLOCKCHAIN_MYSQL_PORT: number;
  BLOCKCHAIN_MYSQL_DATABASE: string;
  BLOCKCHAIN_MYSQL_USER: string;
  BLOCKCHAIN_MYSQL_PASSWORD: string;

  BLOCKCHAIN_MYSQL_DEPLOY_USER: string;
  BLOCKCHAIN_MYSQL_DEPLOY_PASSWORD: string;

  BLOCKCHAIN_SOCKET_PORT_TEST: number;
  BLOCKCHAIN_MYSQL_HOST_TEST: string;
  BLOCKCHAIN_MYSQL_PORT_TEST: number;
  BLOCKCHAIN_MYSQL_DATABASE_TEST: string;
  BLOCKCHAIN_MYSQL_USER_TEST: string;
  BLOCKCHAIN_MYSQL_PASSWORD_TEST: string;

  BLOCKCHAIN_AWS_WORKER_SQS_URL: string;
  BLOCKCHAIN_AWS_WORKER_SQS_ARN: string;
  BLOCKCHAIN_AWS_WORKER_LAMBDA_NAME: string;

  BLOCKCHAIN_CRUST_GRAPHQL_SERVER: string;
  BLOCKCHAIN_KILT_GRAPHQL_SERVER: string;
  BLOCKCHAIN_PHALA_GRAPHQL_SERVER: string;
  BLOCKCHAIN_SECRETS: string;

  /**
   * EVM blockchain indexers
   */
  BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER: string;
  BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER: string;
  BLOCKCHAIN_ASTAR_GRAPHQL_SERVER: string;

  /************************************************************
   * API - Apillon API config
   ************************************************************/
  APILLON_API_HOST: string;
  APILLON_API_PORT: number;
  APILLON_API_HOST_TEST: string;
  APILLON_API_PORT_TEST: number;

  APILLON_API_URL: string;

  APILLON_API_SYSTEM_API_KEY: string;
  APILLON_API_SYSTEM_API_SECRET: string;

  APILLON_API_INTEGRATION_API_KEY: string;
  APILLON_API_INTEGRATION_API_SECRET: string;

  /************************************************************
   * AUTH - Apillon Authentication Service
   ************************************************************/
  // MAIN
  AUTH_API_HOST: string;
  AUTH_API_PORT: number;

  AUTH_APP_URL: string;

  AUTH_API_MYSQL_HOST: string;
  AUTH_API_MYSQL_PORT: number;
  AUTH_API_MYSQL_USER: string;
  AUTH_API_MYSQL_PASSWORD: string;
  AUTH_API_MYSQL_DEPLOY_USER: string;
  AUTH_API_MYSQL_DEPLOY_PASSWORD: string;
  AUTH_API_MYSQL_DATABASE: string;

  // TEST
  AUTH_API_HOST_TEST: string;
  AUTH_API_PORT_TEST: number;
  AUTH_APP_URL_TEST: string;
  AUTH_API_MYSQL_HOST_TEST: string;
  AUTH_API_MYSQL_PORT_TEST: number;
  AUTH_API_MYSQL_USER_TEST: string;
  AUTH_API_MYSQL_PASSWORD_TEST: string;
  AUTH_API_MYSQL_DATABASE_TEST: string;

  // MICROSERVICE
  AUTH_FUNCTION_NAME: string;
  AUTH_FUNCTION_NAME_TEST: string;
  AUTH_SOCKET_PORT: number;
  AUTH_SOCKET_PORT_TEST: number;

  //Nova wallet
  NOVA_WALLET_BUCKET_UUID: string;
  NOVA_WALLET_API_KEY: string;
  NOVA_WALLET_API_KEY_SECRET: string;

  /************************************************************
   * Kilt config
   ************************************************************/
  KILT_NETWORK: string;
  KILT_ATTESTER_MNEMONIC: string;
  KILT_DERIVATION_ALGORITHM: string;
  KILT_ATTESTERS_WHITELIST: string;
  KILT_ORIGIN_DOMAIN: string;

  /************************************************************
   * Authentication config (Uses Kilt module)
   ************************************************************/

  AUTH_AWS_WORKER_SQS_URL: string;
  AUTH_AWS_WORKER_LAMBDA_NAME: string;

  /*************************************************************
   * SCS - Apillon System Configuration Service
   *************************************************************/
  /**
   *  function name
   */
  CONFIG_FUNCTION_NAME: string;
  CONFIG_FUNCTION_NAME_TEST: string;

  /**
   * SCS dev server port
   */
  CONFIG_SOCKET_PORT: number;
  CONFIG_SOCKET_PORT_TEST: number;

  /**
   * SCS Database config
   */

  CONFIG_MYSQL_HOST: string;
  CONFIG_MYSQL_PORT: number;
  CONFIG_MYSQL_DATABASE: string;
  CONFIG_MYSQL_USER: string;
  CONFIG_MYSQL_PASSWORD: string;
  CONFIG_MYSQL_DEPLOY_USER: string;
  CONFIG_MYSQL_DEPLOY_PASSWORD: string;

  CONFIG_MYSQL_HOST_TEST: string;
  CONFIG_MYSQL_PORT_TEST: number;
  CONFIG_MYSQL_DATABASE_TEST: string;
  CONFIG_MYSQL_USER_TEST: string;
  CONFIG_MYSQL_PASSWORD_TEST: string;

  /**
   * Config workers config
   */
  CONFIG_AWS_WORKER_SQS_URL: string;
  CONFIG_AWS_WORKER_LAMBDA_NAME: string;

  /************************************************************
   * REF - Apillon Referral Service
   ************************************************************/
  REFERRAL_FUNCTION_NAME: string;
  REFERRAL_FUNCTION_NAME_TEST: string;
  REFERRAL_SOCKET_PORT: number;
  REFERRAL_SOCKET_PORT_TEST: number;

  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TWITTER_CONSUMER_TOKEN: string;
  TWITTER_CONSUMER_SECRET: string;
  TWITTER_BEARER_TOKEN: string;
  TWITTER_USER_ID: string;
  OUATH_CALLBACK_URL: string;

  REFERRAL_MYSQL_HOST: string;
  REFERRAL_MYSQL_PORT: number;
  REFERRAL_MYSQL_USER: string;
  REFERRAL_MYSQL_PASSWORD: string;
  REFERRAL_MYSQL_DEPLOY_USER: string;
  REFERRAL_MYSQL_DEPLOY_PASSWORD: string;
  REFERRAL_MYSQL_DATABASE: string;

  REFERRAL_MYSQL_HOST_TEST: string;
  REFERRAL_MYSQL_PORT_TEST: number;
  REFERRAL_MYSQL_USER_TEST: string;
  REFERRAL_MYSQL_PASSWORD_TEST: string;
  REFERRAL_MYSQL_DATABASE_TEST: string;

  /**
   * hCAPTCHA
   */
  CAPTCHA_SECRET: string;
  CAPTCHA_REMEMBER_DAYS: number;
  LOGIN_CAPTCHA_ENABLED: boolean;

  /** DISCORD */
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;

  /** REDIS */
  REDIS_URL: string;
  DEFAULT_CACHE_TTL: number;

  /************************************************************
   * NFTS - Apillon NFTs Service
   ************************************************************/
  /**
   *  function name
   */
  NFTS_FUNCTION_NAME: string;
  NFTS_FUNCTION_NAME_TEST: string;

  /**
   * NFTS dev server port
   */
  NFTS_SOCKET_PORT: number;
  NFTS_SOCKET_PORT_TEST: number;

  /**
   * NFTS Database config
   */

  NFTS_MYSQL_HOST: string;
  NFTS_MYSQL_PORT: number;
  NFTS_MYSQL_USER: string;
  NFTS_MYSQL_PASSWORD: string;
  NFTS_MYSQL_DEPLOY_USER: string;
  NFTS_MYSQL_DEPLOY_PASSWORD: string;
  NFTS_MYSQL_DATABASE: string;

  // TEST
  NFTS_MYSQL_HOST_TEST: string;
  NFTS_MYSQL_PORT_TEST: number;
  NFTS_MYSQL_USER_TEST: string;
  NFTS_MYSQL_PASSWORD_TEST: string;
  NFTS_MYSQL_DATABASE_TEST: string;

  /**
   * NFT Moonbeam config
   */
  NFTS_MOONBEAM_TESTNET_RPC: string;
  NFTS_MOONBEAM_MAINNET_RPC: string;
  NFTS_ASTAR_TESTNET_RPC: string;
  NFTS_ASTAR_MAINNET_RPC: string;

  /**
   * NFT workers config
   */
  NFTS_AWS_WORKER_SQS_URL: string;
  NFTS_AWS_WORKER_LAMBDA_NAME: string;

  /************************************************************
   * COMPUTING - Apillon Computing Service
   ************************************************************/
  /**
   *  function name
   */
  COMPUTING_FUNCTION_NAME: string;
  COMPUTING_FUNCTION_NAME_TEST: string;

  /**
   * COMPUTING dev server port
   */
  COMPUTING_SOCKET_PORT: number;
  COMPUTING_SOCKET_PORT_TEST: number;

  /**
   * COMPUTING Database config
   */

  COMPUTING_MYSQL_HOST: string;
  COMPUTING_MYSQL_PORT: number;
  COMPUTING_MYSQL_USER: string;
  COMPUTING_MYSQL_PASSWORD: string;
  COMPUTING_MYSQL_DEPLOY_USER: string;
  COMPUTING_MYSQL_DEPLOY_PASSWORD: string;
  COMPUTING_MYSQL_DATABASE: string;

  // TEST
  COMPUTING_MYSQL_HOST_TEST: string;
  COMPUTING_MYSQL_PORT_TEST: number;
  COMPUTING_MYSQL_USER_TEST: string;
  COMPUTING_MYSQL_PASSWORD_TEST: string;
  COMPUTING_MYSQL_DATABASE_TEST: string;

  /**
   * COMPUTING workers config
   */
  COMPUTING_AWS_WORKER_SQS_URL: string;
  COMPUTING_AWS_WORKER_LAMBDA_NAME: string;

  /**
   * METABASE EMBED
   */

  METABASE_SECRET: string;
  METABASE_URL: string;

  /**
   * STRIPE API
   */
  STRIPE_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SECRET_TEST: string;

  /**
   * MAILERLITE
   */
  MAILERLITE_API_KEY: string;

  /************************************************************
   * Social - Apillon social Service
   ************************************************************/
  /**
   *  function name
   */
  SOCIAL_FUNCTION_NAME: string;
  SOCIAL_FUNCTION_NAME_TEST: string;

  /**
   * SOCIAL dev server port
   */
  SOCIAL_SOCKET_PORT: number;
  SOCIAL_SOCKET_PORT_TEST: number;

  /**
   * SOCIAL Database config
   */

  SOCIAL_MYSQL_HOST: string;
  SOCIAL_MYSQL_PORT: number;
  SOCIAL_MYSQL_USER: string;
  SOCIAL_MYSQL_PASSWORD: string;
  SOCIAL_MYSQL_DEPLOY_USER: string;
  SOCIAL_MYSQL_DEPLOY_PASSWORD: string;
  SOCIAL_MYSQL_DATABASE: string;

  // TEST
  SOCIAL_MYSQL_HOST_TEST: string;
  SOCIAL_MYSQL_PORT_TEST: number;
  SOCIAL_MYSQL_USER_TEST: string;
  SOCIAL_MYSQL_PASSWORD_TEST: string;
  SOCIAL_MYSQL_DATABASE_TEST: string;

  /**
   * SOCIAL workers config
   */
  SOCIAL_AWS_WORKER_SQS_URL: string;
  SOCIAL_AWS_WORKER_LAMBDA_NAME: string;
}

// dotenv.config();
dotenv.config({ path: '../../.env' });

export let env: IEnv = {
  APP_URL: process.env['APP_URL'] || 'https://app.apillon.io',
  APP_ENV: process.env['APP_ENV'] || AppEnvironment.LOCAL_DEV,
  LOG_TARGET: process.env['LOG_TARGET'] || 'console',
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'no-db',
  AWS_REGION: process.env['AWS_REGION'], // env var from lambda - can not be overwritten in lambda setting!
  AWS_SECRETS_ID: process.env['AWS_SECRETS_ID'] || '',
  AWS_KEY: process.env['AWS_KEY'],
  AWS_SECRET: process.env['AWS_SECRET'],
  AWS_BUCKET: process.env['AWS_BUCKET'],
  AWS_ENDPOINT: process.env['AWS_ENDPOINT'],
  APP_SECRET: process.env['APP_SECRET'] || 'Du7Rvyqt7u38naZ2',
  CONSOLE_API_URL: process.env['CONSOLE_API_URL'],
  ADMIN_APP_URL: process.env['ADMIN_APP_URL'],

  /** AMS */
  ACCESS_FUNCTION_NAME: process.env['ACCESS_FUNCTION_NAME'],
  ACCESS_FUNCTION_NAME_TEST: process.env['ACCESS_FUNCTION_NAME_TEST'],
  ACCESS_SOCKET_PORT: parseInt(process.env['ACCESS_SOCKET_PORT']) || 6101,
  ACCESS_MYSQL_HOST: process.env['ACCESS_MYSQL_HOST'],
  ACCESS_MYSQL_PORT: parseInt(process.env['ACCESS_MYSQL_PORT']) || 3306,
  ACCESS_MYSQL_DATABASE: process.env['ACCESS_MYSQL_DATABASE'],
  ACCESS_MYSQL_USER: process.env['ACCESS_MYSQL_USER'],
  ACCESS_MYSQL_PASSWORD: process.env['ACCESS_MYSQL_PASSWORD'],
  ACCESS_MYSQL_DEPLOY_USER: process.env['ACCESS_MYSQL_DEPLOY_USER'],
  ACCESS_MYSQL_DEPLOY_PASSWORD: process.env['ACCESS_MYSQL_DEPLOY_PASSWORD'],

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
  MONITORING_SQS_URL: process.env['MONITORING_SQS_URL'],
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

  SLACK_TOKEN: process.env['SLACK_TOKEN'],
  SLACK_CHANNEL: process.env['SLACK_CHANNEL'] || 'monitoring',
  SLACK_CHANNEL_FOR_WEBSITE_REVIEWS:
    process.env['SLACK_CHANNEL_FOR_WEBSITE_REVIEWS'] || 'website-reviews',
  /** DEV CONSOLE API DB conn*/
  DEV_CONSOLE_API_MYSQL_HOST: process.env['DEV_CONSOLE_API_MYSQL_HOST'],
  DEV_CONSOLE_API_MYSQL_PORT:
    parseInt(process.env['DEV_CONSOLE_API_MYSQL_PORT']) || 3306,
  DEV_CONSOLE_API_MYSQL_USER: process.env['DEV_CONSOLE_API_MYSQL_USER'],
  DEV_CONSOLE_API_MYSQL_PASSWORD: process.env['DEV_CONSOLE_API_MYSQL_PASSWORD'],
  DEV_CONSOLE_API_MYSQL_DEPLOY_USER:
    process.env['DEV_CONSOLE_API_MYSQL_DEPLOY_USER'],
  DEV_CONSOLE_API_MYSQL_DEPLOY_PASSWORD:
    process.env['DEV_CONSOLE_API_MYSQL_DEPLOY_PASSWORD'],
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
    process.env['DEV_CONSOLE_API_HOST_TEST'] || 'localhost',
  DEV_CONSOLE_API_PORT_TEST:
    parseInt(process.env['DEV_CONSOLE_API_PORT_TEST']) || 7001,
  DEV_CONSOLE_API_DEFAULT_PROJECT_UUID:
    process.env['DEV_CONSOLE_API_DEFAULT_PROJECT_UUID'] ||
    '22a9788a-f043-4d4c-8f47-d07a0509c645',

  ADMIN_CONSOLE_API_HOST: process.env['ADMIN_CONSOLE_API_HOST'] || 'localhost',
  ADMIN_CONSOLE_API_PORT:
    parseInt(process.env['ADMIN_CONSOLE_API_PORT']) || 6004,
  ADMIN_CONSOLE_API_HOST_TEST:
    process.env['ADMIN_CONSOLE_API_HOST_TEST'] || 'localhost',
  ADMIN_CONSOLE_API_PORT_TEST:
    parseInt(process.env['ADMIN_CONSOLE_API_PORT_TEST']) || 7004,

  /** SQL UTILS */
  DEFAULT_PAGE_SIZE: parseInt(process.env['DEFAULT_PAGE_SIZE']) || 20,

  /**STORAGE microservice */
  STORAGE_FUNCTION_NAME: process.env['STORAGE_FUNCTION_NAME'],
  STORAGE_FUNCTION_NAME_TEST: process.env['STORAGE_FUNCTION_NAME_TEST'],
  STORAGE_SOCKET_PORT: parseInt(process.env['STORAGE_SOCKET_PORT']) || 6301,
  STORAGE_SOCKET_PORT_TEST:
    parseInt(process.env['STORAGE_SOCKET_PORT_TEST']) || 7301,
  STORAGE_CRUST_SEED_PHRASE: process.env['STORAGE_CRUST_SEED_PHRASE'],
  STORAGE_CRUST_SEED_PHRASE_TEST: process.env['STORAGE_CRUST_SEED_PHRASE_TEST'],
  STORAGE_AWS_IPFS_QUEUE_BUCKET: process.env['STORAGE_AWS_IPFS_QUEUE_BUCKET'],
  URL_SCREENSHOT_FUNCTION_NAME: process.env['URL_SCREENSHOT_FUNCTION_NAME'],
  URL_SCREENSHOT_API_URL: process.env['URL_SCREENSHOT_API_URL'],
  SEND_WEBSITES_TO_REVIEW:
    parseInt(process.env['SEND_WEBSITES_TO_REVIEW']) || 1,

  /**STORAGE microservice DB*/
  STORAGE_MYSQL_HOST: process.env['STORAGE_MYSQL_HOST'],
  STORAGE_MYSQL_PORT: parseInt(process.env['STORAGE_MYSQL_PORT']) || 3306,
  STORAGE_MYSQL_USER: process.env['STORAGE_MYSQL_USER'],
  STORAGE_MYSQL_PASSWORD: process.env['STORAGE_MYSQL_PASSWORD'],
  STORAGE_MYSQL_DEPLOY_USER: process.env['STORAGE_MYSQL_DEPLOY_USER'],
  STORAGE_MYSQL_DEPLOY_PASSWORD: process.env['STORAGE_MYSQL_DEPLOY_PASSWORD'],
  STORAGE_MYSQL_DATABASE: process.env['STORAGE_MYSQL_DATABASE'],

  /**STORAGE microservice - TEST DB */
  STORAGE_MYSQL_HOST_TEST: process.env['STORAGE_MYSQL_HOST_TEST'],
  STORAGE_MYSQL_PORT_TEST:
    parseInt(process.env['STORAGE_MYSQL_PORT_TEST']) || 3306,
  STORAGE_MYSQL_USER_TEST: process.env['STORAGE_MYSQL_USER_TEST'],
  STORAGE_MYSQL_PASSWORD_TEST: process.env['STORAGE_MYSQL_PASSWORD_TEST'],
  STORAGE_MYSQL_DATABASE_TEST: process.env['STORAGE_MYSQL_DATABASE_TEST'],

  /** Blockchain service **/
  BLOCKCHAIN_FUNCTION_NAME: process.env['BLOCKCHAIN_FUNCTION_NAME'],
  BLOCKCHAIN_FUNCTION_NAME_TEST: process.env['BLOCKCHAIN_FUNCTION_NAME_TEST'],
  BLOCKCHAIN_SOCKET_PORT:
    parseInt(process.env['BLOCKCHAIN_SOCKET_PORT']) || 6901,
  BLOCKCHAIN_MYSQL_HOST: process.env['BLOCKCHAIN_MYSQL_HOST'],
  BLOCKCHAIN_MYSQL_PORT: parseInt(process.env['BLOCKCHAIN_MYSQL_PORT']) || 3306,
  BLOCKCHAIN_MYSQL_DATABASE: process.env['BLOCKCHAIN_MYSQL_DATABASE'],
  BLOCKCHAIN_MYSQL_USER: process.env['BLOCKCHAIN_MYSQL_USER'],
  BLOCKCHAIN_MYSQL_PASSWORD: process.env['BLOCKCHAIN_MYSQL_PASSWORD'],

  BLOCKCHAIN_MYSQL_DEPLOY_USER: process.env['BLOCKCHAIN_MYSQL_DEPLOY_USER'],
  BLOCKCHAIN_MYSQL_DEPLOY_PASSWORD:
    process.env['BLOCKCHAIN_MYSQL_DEPLOY_PASSWORD'],

  BLOCKCHAIN_SOCKET_PORT_TEST:
    parseInt(process.env['BLOCKCHAIN_SOCKET_PORT_TEST']) || 7901,
  BLOCKCHAIN_MYSQL_HOST_TEST: process.env['BLOCKCHAIN_MYSQL_HOST_TEST'],
  BLOCKCHAIN_MYSQL_PORT_TEST:
    parseInt(process.env['BLOCKCHAIN_MYSQL_PORT_TEST']) || 3306,
  BLOCKCHAIN_MYSQL_DATABASE_TEST: process.env['BLOCKCHAIN_MYSQL_DATABASE_TEST'],
  BLOCKCHAIN_MYSQL_USER_TEST: process.env['BLOCKCHAIN_MYSQL_USER_TEST'],
  BLOCKCHAIN_MYSQL_PASSWORD_TEST: process.env['BLOCKCHAIN_MYSQL_PASSWORD_TEST'],

  BLOCKCHAIN_CRUST_GRAPHQL_SERVER:
    process.env['BLOCKCHAIN_CRUST_GRAPHQL_SERVER'],
  BLOCKCHAIN_KILT_GRAPHQL_SERVER: process.env['BLOCKCHAIN_KILT_GRAPHQL_SERVER'],
  BLOCKCHAIN_PHALA_GRAPHQL_SERVER:
    process.env['BLOCKCHAIN_PHALA_GRAPHQL_SERVER'],
  BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER:
    process.env['BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER'],
  BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER:
    process.env['BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER'],
  BLOCKCHAIN_ASTAR_GRAPHQL_SERVER:
    process.env['BLOCKCHAIN_ASTAR_GRAPHQL_SERVER'],

  BLOCKCHAIN_SECRETS: process.env['BLOCKCHAIN_SECRETS'],

  /**
   * AWS SQS url for worker communications
   */
  BLOCKCHAIN_AWS_WORKER_SQS_URL: process.env['BLOCKCHAIN_AWS_WORKER_SQS_URL'],
  BLOCKCHAIN_AWS_WORKER_SQS_ARN: process.env['BLOCKCHAIN_AWS_WORKER_SQS_ARN'],
  BLOCKCHAIN_AWS_WORKER_LAMBDA_NAME:
    process.env['BLOCKCHAIN_AWS_WORKER_LAMBDA_NAME'],

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
  CONTACT_EMAIL_TO: process.env['CONTACT_EMAIL_TO'] || 'info@apillon.io',

  /** --- SECTION: APILLON API --- */
  APILLON_API_HOST: process.env['APILLON_API_HOST'] || 'localhost',
  APILLON_API_PORT: parseInt(process.env['APILLON_API_PORT']) || 6002,
  APILLON_API_HOST_TEST: process.env['APILLON_API_HOST_TEST'] || '127.0.0.1',
  APILLON_API_PORT_TEST: parseInt(process.env['APILLON_API_PORT_TEST']) || 7002,
  APILLON_API_SYSTEM_API_KEY: process.env['APILLON_API_SYSTEM_API_KEY'] || '',
  APILLON_API_SYSTEM_API_SECRET:
    process.env['APILLON_API_SYSTEM_API_SECRET'] || '',
  APILLON_API_INTEGRATION_API_KEY:
    process.env['APILLON_API_INTEGRATION_API_KEY'] || '',
  APILLON_API_INTEGRATION_API_SECRET:
    process.env['APILLON_API_INTEGRATION_API_SECRET'] || '',
  APILLON_API_URL: process.env['APILLON_API_URL'] || 'http://localhost:6002',

  /** --- SECTION: APILLON AUTHENTICATION API --- */
  AUTH_API_HOST: process.env['AUTH_API_HOST'] || 'localhost',
  AUTH_API_PORT: parseInt(process.env['AUTH_API_PORT']) || 6003,
  AUTH_API_HOST_TEST: process.env['AUTH_API_HOST_TEST'] || 'localhost',
  AUTH_API_PORT_TEST: parseInt(process.env['AUTH_API_PORT_TEST']) || 7003,
  // Frontend app
  AUTH_APP_URL: process.env['AUTH_APP_URL'] || 'http://localhost:5173',
  AUTH_APP_URL_TEST:
    process.env['AUTH_APP_URL_TEST'] || 'http://localhost:5173',

  /** AUTHENTICATION API DEV DB conn */
  AUTH_API_MYSQL_HOST: process.env['AUTH_API_MYSQL_HOST'],
  AUTH_API_MYSQL_PORT: parseInt(process.env['AUTH_API_MYSQL_PORT']) || 3306,
  AUTH_API_MYSQL_USER: process.env['AUTH_API_MYSQL_USER'],
  AUTH_API_MYSQL_PASSWORD: process.env['AUTH_API_MYSQL_PASSWORD'],
  AUTH_API_MYSQL_DEPLOY_USER: process.env['AUTH_API_MYSQL_DEPLOY_USER'],
  AUTH_API_MYSQL_DEPLOY_PASSWORD: process.env['AUTH_API_MYSQL_DEPLOY_PASSWORD'],
  AUTH_API_MYSQL_DATABASE: process.env['AUTH_API_MYSQL_DATABASE'],
  AUTH_API_MYSQL_HOST_TEST: process.env['AUTH_API_MYSQL_HOST_TEST'],
  AUTH_API_MYSQL_PORT_TEST:
    parseInt(process.env['AUTH_API_MYSQL_PORT_TEST']) || 3306,
  AUTH_API_MYSQL_USER_TEST: process.env['AUTH_API_MYSQL_USER_TEST'],
  AUTH_API_MYSQL_PASSWORD_TEST: process.env['AUTH_API_MYSQL_PASSWORD_TEST'],
  AUTH_API_MYSQL_DATABASE_TEST: process.env['AUTH_API_MYSQL_DATABASE_TEST'],

  /** KILT */
  KILT_NETWORK:
    process.env['KILT_NETWORK'] ||
    'wss://peregrine.kilt.io/parachain-public-ws',
  KILT_ATTESTER_MNEMONIC: process.env['KILT_ATTESTER_MNEMONIC'] || '',
  KILT_ATTESTERS_WHITELIST: process.env['KILT_ATTESTERS_WHITELIST'] || '',
  KILT_ORIGIN_DOMAIN: process.env['KILT_ORIGIN_DOMAIN'] || '',
  // TODO: Unused -> Left here because we might introduce it later as configurable algorithm
  // because it depends where you use this mnemonic
  KILT_DERIVATION_ALGORITHM:
    process.env['KILT_DERIVATION_ALGORITHM'] || 'sr25519',
  AUTH_AWS_WORKER_SQS_URL: process.env['AUTH_AWS_WORKER_SQS_URL'] || '',
  AUTH_AWS_WORKER_LAMBDA_NAME: process.env['AUTH_AWS_WORKER_LAMBDA_NAME'] || '',

  /** NOVA WALLET - AUTHENTICATION API */
  NOVA_WALLET_BUCKET_UUID: process.env['NOVA_WALLET_BUCKET_UUID'] || '',
  NOVA_WALLET_API_KEY: process.env['NOVA_WALLET_API_KEY'] || '',
  NOVA_WALLET_API_KEY_SECRET: process.env['NOVA_WALLET_API_KEY_SECRET'] || '',

  /**Apillon Serverless workers config*/
  /**
   * AWS SQS url for worker communications
   */
  STORAGE_AWS_WORKER_SQS_URL: process.env['STORAGE_AWS_WORKER_SQS_URL'],
  STORAGE_AWS_WORKER_SQS_ARN: process.env['STORAGE_AWS_WORKER_SQS_ARN'],
  STORAGE_AWS_WORKER_LAMBDA_NAME: process.env['STORAGE_AWS_WORKER_LAMBDA_NAME'],

  /** SCS */
  CONFIG_FUNCTION_NAME: process.env['CONFIG_FUNCTION_NAME'],
  CONFIG_FUNCTION_NAME_TEST: process.env['CONFIG_FUNCTION_NAME_TEST'],
  CONFIG_SOCKET_PORT: parseInt(process.env['CONFIG_SOCKET_PORT']) || 6501,
  CONFIG_MYSQL_HOST: process.env['CONFIG_MYSQL_HOST'],
  CONFIG_MYSQL_PORT: parseInt(process.env['CONFIG_MYSQL_PORT']) || 3306,
  CONFIG_MYSQL_DATABASE: process.env['CONFIG_MYSQL_DATABASE'],
  CONFIG_MYSQL_USER: process.env['CONFIG_MYSQL_USER'],
  CONFIG_MYSQL_PASSWORD: process.env['CONFIG_MYSQL_PASSWORD'],
  CONFIG_MYSQL_DEPLOY_USER: process.env['CONFIG_MYSQL_DEPLOY_USER'],
  CONFIG_MYSQL_DEPLOY_PASSWORD: process.env['CONFIG_MYSQL_DEPLOY_PASSWORD'],

  CONFIG_SOCKET_PORT_TEST:
    parseInt(process.env['CONFIG_SOCKET_PORT_TEST']) || 7501,
  CONFIG_MYSQL_HOST_TEST: process.env['CONFIG_MYSQL_HOST_TEST'],
  CONFIG_MYSQL_PORT_TEST:
    parseInt(process.env['CONFIG_MYSQL_PORT_TEST']) || 3306,
  CONFIG_MYSQL_DATABASE_TEST: process.env['CONFIG_MYSQL_DATABASE_TEST'],
  CONFIG_MYSQL_USER_TEST: process.env['CONFIG_MYSQL_USER_TEST'],
  CONFIG_MYSQL_PASSWORD_TEST: process.env['CONFIG_MYSQL_PASSWORD_TEST'],

  /**
   * AWS SQS url for worker communications
   */
  CONFIG_AWS_WORKER_SQS_URL: process.env['CONFIG_AWS_WORKER_SQS_URL'],
  CONFIG_AWS_WORKER_LAMBDA_NAME: process.env['CONFIG_AWS_WORKER_LAMBDA_NAME'],

  /**REFERRAL microservice */
  REFERRAL_FUNCTION_NAME: process.env['REFERRAL_FUNCTION_NAME'],
  REFERRAL_FUNCTION_NAME_TEST: process.env['REFERRAL_FUNCTION_NAME_TEST'],
  REFERRAL_SOCKET_PORT: parseInt(process.env['REFERRAL_SOCKET_PORT']) || 6601,
  REFERRAL_SOCKET_PORT_TEST:
    parseInt(process.env['REFERRAL_SOCKET_PORT_TEST']) || 7601,
  GITHUB_CLIENT_ID: process.env['GITHUB_CLIENT_ID'],
  GITHUB_CLIENT_SECRET: process.env['GITHUB_CLIENT_SECRET'],
  TWITTER_CONSUMER_TOKEN: process.env['TWITTER_CONSUMER_TOKEN'],
  TWITTER_CONSUMER_SECRET: process.env['TWITTER_CONSUMER_SECRET'],
  TWITTER_BEARER_TOKEN: process.env['TWITTER_BEARER_TOKEN'],
  TWITTER_USER_ID: process.env['TWITTER_USER_ID'],
  OUATH_CALLBACK_URL: process.env['OUATH_CALLBACK_URL'],

  /**REFERRAL microservice */
  REFERRAL_MYSQL_HOST: process.env['REFERRAL_MYSQL_HOST'],
  REFERRAL_MYSQL_PORT: parseInt(process.env['REFERRAL_MYSQL_PORT']) || 3306,
  REFERRAL_MYSQL_USER: process.env['REFERRAL_MYSQL_USER'],
  REFERRAL_MYSQL_PASSWORD: process.env['REFERRAL_MYSQL_PASSWORD'],
  REFERRAL_MYSQL_DEPLOY_USER: process.env['REFERRAL_MYSQL_DEPLOY_USER'],
  REFERRAL_MYSQL_DEPLOY_PASSWORD: process.env['REFERRAL_MYSQL_DEPLOY_PASSWORD'],
  REFERRAL_MYSQL_DATABASE: process.env['REFERRAL_MYSQL_DATABASE'],

  /**REFERRAL microservice - TEST DB */
  REFERRAL_MYSQL_HOST_TEST: process.env['REFERRAL_MYSQL_HOST_TEST'],
  REFERRAL_MYSQL_PORT_TEST:
    parseInt(process.env['REFERRAL_MYSQL_PORT_TEST']) || 3306,
  REFERRAL_MYSQL_USER_TEST: process.env['REFERRAL_MYSQL_USER_TEST'],
  REFERRAL_MYSQL_PASSWORD_TEST: process.env['REFERRAL_MYSQL_PASSWORD_TEST'],
  REFERRAL_MYSQL_DATABASE_TEST: process.env['REFERRAL_MYSQL_DATABASE_TEST'],

  /** CAPTCHA */
  CAPTCHA_SECRET: process.env['CAPTCHA_SECRET'] || '',
  CAPTCHA_REMEMBER_DAYS: +process.env['CAPTCHA_REMEMBER_DAYS'] || 7,
  LOGIN_CAPTCHA_ENABLED: process.env['LOGIN_CAPTCHA_ENABLED'] !== 'false',

  /** AUTH MICROSERVICE */
  AUTH_FUNCTION_NAME: process.env['AUTH_FUNCTION_NAME'],
  AUTH_FUNCTION_NAME_TEST: process.env['AUTH_FUNCTION_NAME_TEST'],
  AUTH_SOCKET_PORT: parseInt(process.env['AUTH_SOCKET_PORT']) || 6801,
  AUTH_SOCKET_PORT_TEST: parseInt(process.env['AUTH_SOCKET_PORT_TEST']) || 7801,

  /** NFTS */
  NFTS_FUNCTION_NAME: process.env['NFTS_FUNCTION_NAME'],
  NFTS_FUNCTION_NAME_TEST: process.env['NFTS_FUNCTION_NAME_TEST'],
  NFTS_SOCKET_PORT: parseInt(process.env['NFTS_SOCKET_PORT']) || 6701,
  NFTS_MYSQL_HOST: process.env['NFTS_MYSQL_HOST'],
  NFTS_MYSQL_PORT: parseInt(process.env['NFTS_MYSQL_PORT']) || 3306,
  NFTS_MYSQL_DATABASE: process.env['NFTS_MYSQL_DATABASE'],
  NFTS_MYSQL_USER: process.env['NFTS_MYSQL_USER'],
  NFTS_MYSQL_PASSWORD: process.env['NFTS_MYSQL_PASSWORD'],
  NFTS_MYSQL_DEPLOY_USER: process.env['NFTS_MYSQL_DEPLOY_USER'],
  NFTS_MYSQL_DEPLOY_PASSWORD: process.env['NFTS_MYSQL_DEPLOY_PASSWORD'],

  NFTS_SOCKET_PORT_TEST: parseInt(process.env['NFTS_SOCKET_PORT_TEST']) || 7701,
  NFTS_MYSQL_HOST_TEST: process.env['NFTS_MYSQL_HOST_TEST'],
  NFTS_MYSQL_PORT_TEST: parseInt(process.env['NFTS_MYSQL_PORT_TEST']) || 3306,
  NFTS_MYSQL_DATABASE_TEST: process.env['NFTS_MYSQL_DATABASE_TEST'],
  NFTS_MYSQL_USER_TEST: process.env['NFTS_MYSQL_USER_TEST'],
  NFTS_MYSQL_PASSWORD_TEST: process.env['NFTS_MYSQL_PASSWORD_TEST'],

  NFTS_MOONBEAM_TESTNET_RPC: process.env['NFTS_MOONBEAM_TESTNET_RPC'],
  NFTS_MOONBEAM_MAINNET_RPC: process.env['NFTS_MOONBEAM_MAINNET_RPC'],
  NFTS_ASTAR_TESTNET_RPC: process.env['NFTS_ASTAR_TESTNET_RPC'],
  NFTS_ASTAR_MAINNET_RPC: process.env['NFTS_ASTAR_MAINNET_RPC'],
  NFTS_AWS_WORKER_SQS_URL: process.env['NFTS_AWS_WORKER_SQS_URL'],
  NFTS_AWS_WORKER_LAMBDA_NAME: process.env['NFTS_AWS_WORKER_LAMBDA_NAME'],

  /** COMPUTING */
  COMPUTING_FUNCTION_NAME: process.env['COMPUTING_FUNCTION_NAME'],
  COMPUTING_FUNCTION_NAME_TEST: process.env['COMPUTING_FUNCTION_NAME_TEST'],
  COMPUTING_SOCKET_PORT: parseInt(process.env['COMPUTING_SOCKET_PORT']) || 6102,
  COMPUTING_MYSQL_HOST: process.env['COMPUTING_MYSQL_HOST'],
  COMPUTING_MYSQL_PORT: parseInt(process.env['COMPUTING_MYSQL_PORT']) || 3306,
  COMPUTING_MYSQL_DATABASE: process.env['COMPUTING_MYSQL_DATABASE'],
  COMPUTING_MYSQL_USER: process.env['COMPUTING_MYSQL_USER'],
  COMPUTING_MYSQL_PASSWORD: process.env['COMPUTING_MYSQL_PASSWORD'],
  COMPUTING_MYSQL_DEPLOY_USER: process.env['COMPUTING_MYSQL_DEPLOY_USER'],
  COMPUTING_MYSQL_DEPLOY_PASSWORD:
    process.env['COMPUTING_MYSQL_DEPLOY_PASSWORD'],

  COMPUTING_SOCKET_PORT_TEST:
    parseInt(process.env['COMPUTING_SOCKET_PORT_TEST']) || 7102,
  COMPUTING_MYSQL_HOST_TEST: process.env['COMPUTING_MYSQL_HOST_TEST'],
  COMPUTING_MYSQL_PORT_TEST:
    parseInt(process.env['COMPUTING_MYSQL_PORT_TEST']) || 3306,
  COMPUTING_MYSQL_DATABASE_TEST: process.env['COMPUTING_MYSQL_DATABASE_TEST'],
  COMPUTING_MYSQL_USER_TEST: process.env['COMPUTING_MYSQL_USER_TEST'],
  COMPUTING_MYSQL_PASSWORD_TEST: process.env['COMPUTING_MYSQL_PASSWORD_TEST'],

  COMPUTING_AWS_WORKER_SQS_URL: process.env['COMPUTING_AWS_WORKER_SQS_URL'],
  COMPUTING_AWS_WORKER_LAMBDA_NAME:
    process.env['COMPUTING_AWS_WORKER_LAMBDA_NAME'],

  /** SOCIAL */
  SOCIAL_FUNCTION_NAME: process.env['SOCIAL_FUNCTION_NAME'],
  SOCIAL_FUNCTION_NAME_TEST: process.env['SOCIAL_FUNCTION_NAME_TEST'],
  SOCIAL_SOCKET_PORT: parseInt(process.env['SOCIAL_SOCKET_PORT']) || 6202,
  SOCIAL_MYSQL_HOST: process.env['SOCIAL_MYSQL_HOST'],
  SOCIAL_MYSQL_PORT: parseInt(process.env['SOCIAL_MYSQL_PORT']) || 3306,
  SOCIAL_MYSQL_DATABASE: process.env['SOCIAL_MYSQL_DATABASE'],
  SOCIAL_MYSQL_USER: process.env['SOCIAL_MYSQL_USER'],
  SOCIAL_MYSQL_PASSWORD: process.env['SOCIAL_MYSQL_PASSWORD'],
  SOCIAL_MYSQL_DEPLOY_USER: process.env['SOCIAL_MYSQL_DEPLOY_USER'],
  SOCIAL_MYSQL_DEPLOY_PASSWORD: process.env['SOCIAL_MYSQL_DEPLOY_PASSWORD'],

  SOCIAL_SOCKET_PORT_TEST:
    parseInt(process.env['SOCIAL_SOCKET_PORT_TEST']) || 7202,
  SOCIAL_MYSQL_HOST_TEST: process.env['SOCIAL_MYSQL_HOST_TEST'],
  SOCIAL_MYSQL_PORT_TEST:
    parseInt(process.env['SOCIAL_MYSQL_PORT_TEST']) || 3306,
  SOCIAL_MYSQL_DATABASE_TEST: process.env['SOCIAL_MYSQL_DATABASE_TEST'],
  SOCIAL_MYSQL_USER_TEST: process.env['SOCIAL_MYSQL_USER_TEST'],
  SOCIAL_MYSQL_PASSWORD_TEST: process.env['SOCIAL_MYSQL_PASSWORD_TEST'],

  SOCIAL_AWS_WORKER_SQS_URL: process.env['SOCIAL_AWS_WORKER_SQS_URL'],
  SOCIAL_AWS_WORKER_LAMBDA_NAME: process.env['SOCIAL_AWS_WORKER_LAMBDA_NAME'],

  /** DISCORD */
  DISCORD_CLIENT_ID: process.env['DISCORD_CLIENT_ID'] || '',
  DISCORD_CLIENT_SECRET: process.env['DISCORD_CLIENT_SECRET'] || '',
  DISCORD_REDIRECT_URI: process.env['DISCORD_REDIRECT_URI'] || '',

  //** REDIS */
  REDIS_URL: process.env['REDIS_URL'],
  DEFAULT_CACHE_TTL: +process.env['DEFAULT_CACHE_TTL'] || CacheKeyTTL.DEFAULT, // 5 min

  /** METABASE */
  METABASE_SECRET: process.env['METABASE_SECRET'] || '',
  METABASE_URL: process.env['METABASE_URL'] || 'https://metabase.apillon.io',

  /** STRIPE */
  STRIPE_SECRET: process.env['STRIPE_SECRET'],
  STRIPE_SECRET_TEST: process.env['STRIPE_SECRET_TEST'],
  STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'],

  /** MAILERLITE */
  MAILERLITE_API_KEY: process.env['MAILERLITE_API_KEY'],
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
  // only uncomment for debugging... should not print out in production!!!
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
    const secrets = await getSecrets(env.AWS_SECRETS_ID);
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
