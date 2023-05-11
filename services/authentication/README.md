# Apillon Authentication Service - AUTH

Authentication Service provides functionality for Apillon OAUTH application. It enables developers to use Apillon OAUTH service on their websites. End users can then login to ther websites with help of Kilt blockchain protocol.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Configuration

Environment variables that has to be set:

```ts
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

  /************************************************************
   * Kilt config
   ************************************************************/
  KILT_NETWORK: string;
  KILT_ATTESTER_MNEMONIC: string;
  KILT_DERIVATION_ALGORITHM: string;

  /************************************************************
   * Authentication config (Uses Kilt module)
   ************************************************************/
  AUTH_AWS_WORKER_SQS_URL: string;
  AUTH_AWS_WORKER_LAMBDA_NAME: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
