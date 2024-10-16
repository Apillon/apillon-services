# Apillon Asset Management Service

Service allowing us to manage assets, like wallet refill.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md)
and [Debug and Test](../../docs/debug-and-test.md) documentation. These
instructions will help you set up the development environment and run the
microservice locally.

## Configuration

Environment variables that have to be set:

```ts
/************************************************************
 * Asset Management - Apillon Asset Management Service
 ************************************************************/
/**
 *  function name
 */
ASSET_MANAGEMENT_FUNCTION_NAME: string;
ASSET_MANAGEMENT_FUNCTION_NAME_TEST: string;

/**
 * dev server port
 */
ASSET_MANAGEMENT_SOCKET_PORT: number;
ASSET_MANAGEMENT_SOCKET_PORT_TEST: number;

/**
 * Database config
 */
ASSET_MANAGEMENT_MYSQL_HOST: string;
ASSET_MANAGEMENT_MYSQL_PORT: number;
ASSET_MANAGEMENT_MYSQL_USER: string;
ASSET_MANAGEMENT_MYSQL_PASSWORD: string;
ASSET_MANAGEMENT_MYSQL_DEPLOY_USER: string;
ASSET_MANAGEMENT_MYSQL_DEPLOY_PASSWORD: string;
ASSET_MANAGEMENT_MYSQL_DATABASE: string;

// TEST
ASSET_MANAGEMENT_MYSQL_HOST_TEST: string;
ASSET_MANAGEMENT_MYSQL_PORT_TEST: number;
ASSET_MANAGEMENT_MYSQL_USER_TEST: string;
ASSET_MANAGEMENT_MYSQL_PASSWORD_TEST: string;
ASSET_MANAGEMENT_MYSQL_DATABASE_TEST: string;

/**
 * Contracts workers config
 */
ASSET_MANAGEMENT_AWS_WORKER_SQS_URL: string;
ASSET_MANAGEMENT_AWS_WORKER_LAMBDA_NAME: string;
```

## License

Copyright (c) Apillon - all rights reserved
