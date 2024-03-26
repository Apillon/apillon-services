# Apillon Computing Service - Computing

Computing Service provides functionality for deploying and interaction with
secure execution environments (SEE). Under the hood it utilizes the Phala parachain and this is done by deploying a custom-built
smart contract on Phala and calling its methods which are then executed in SEE.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md)
and [Debug and Test](../../docs/debug-and-test.md) documentation.
These instructions will help you set up the development environment and run the
microservice locally.

## Configuration

Environment variables that have to be set:

```ts
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
   * NFT workers config
   */
  COMPUTING_AWS_WORKER_SQS_URL: string;
  COMPUTING_AWS_WORKER_LAMBDA_NAME: string;
```

## Schrodinger's NFT service

The schrodinger's NFT service/tool is currently powered by the computing microservice and Phala. You can view a demo of the service and learn how it works at https://phala-demo.apillon.io/

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
