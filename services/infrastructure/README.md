# Apillon Infrastructure Service - INFRA

Infrastructure provides functionality for using RPC & Indexer as a service.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Configuration

Environment variables that have to be set:

```ts
/************************************************************
 * INFRASTRUCTURE - Apillon Infrastructure Service
 ************************************************************/
/**
 *  function name
 */
INFRASTRUCTURE_FUNCTION_NAME: string;
INFRASTRUCTURE_FUNCTION_NAME_TEST: string;

/**
 * INFRASTRUCTURE dev server port
 */
INFRASTRUCTURE_SOCKET_PORT: number;
INFRASTRUCTURE_SOCKET_PORT_TEST: number;

/**
 * INFRASTRUCTURE Database config
 */

INFRASTRUCTURE_MYSQL_HOST: string;
INFRASTRUCTURE_MYSQL_PORT: number;
INFRASTRUCTURE_MYSQL_USER: string;
INFRASTRUCTURE_MYSQL_PASSWORD: string;
INFRASTRUCTURE_MYSQL_DEPLOY_USER: string;
INFRASTRUCTURE_MYSQL_DEPLOY_PASSWORD: string;
INFRASTRUCTURE_MYSQL_DATABASE: string;

// TEST
INFRASTRUCTURE_MYSQL_HOST_TEST: string;
INFRASTRUCTURE_MYSQL_PORT_TEST: number;
INFRASTRUCTURE_MYSQL_USER_TEST: string;
INFRASTRUCTURE_MYSQL_PASSWORD_TEST: string;
INFRASTRUCTURE_MYSQL_DATABASE_TEST: string;

/**
 * Infrastructure workers config
 */
INFRASTRUCTURE_AWS_WORKER_SQS_URL: string;
INFRASTRUCTURE_AWS_WORKER_LAMBDA_NAME: string;
INFRASTURCTURE_AWS_WORKER_SQS_ARN: string;

/**
 * Dwellir configuration
 */
DWELLIR_URL: string;
DWELLIR_USERNAME: string;
DWELLIR_PASSWORD: string;

/**
 * Indexer configuration
 */
SQD_ORGANIZATION_CODE: string;
SQD_API_URL: string;
SQD_API_TOKEN: string;
INDEXER_BUCKET_FOR_SOURCE_CODE: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
