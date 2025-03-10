# Apillon Simplets Service

Service allowing us to deploy and smart contract.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md)
and [Debug and Test](../../docs/debug-and-test.md) documentation. These
instructions will help you set up the development environment and run the
microservice locally.

## Configuration

Environment variables that have to be set:

```ts
/************************************************************
 * Simplets - Apillon Simplets Service
 ************************************************************/
/**
 *  function name
 */
SIMPLETS_FUNCTION_NAME: string;
SIMPLETS_FUNCTION_NAME_TEST: string;

/**
 * dev server port
 */
SIMPLETS_SOCKET_PORT: number;
SIMPLETS_SOCKET_PORT_TEST: number;

/**
 * Database config
 */
SIMPLETS_MYSQL_HOST: string;
SIMPLETS_MYSQL_PORT: number;
SIMPLETS_MYSQL_USER: string;
SIMPLETS_MYSQL_PASSWORD: string;
SIMPLETS_MYSQL_DEPLOY_USER: string;
SIMPLETS_MYSQL_DEPLOY_PASSWORD: string;
SIMPLETS_MYSQL_DATABASE: string;

// TEST
SIMPLETS_MYSQL_HOST_TEST: string;
SIMPLETS_MYSQL_PORT_TEST: number;
SIMPLETS_MYSQL_USER_TEST: string;
SIMPLETS_MYSQL_PASSWORD_TEST: string;
SIMPLETS_MYSQL_DATABASE_TEST: string;

/**
 * Simplets workers config
 */
SIMPLETS_AWS_WORKER_SQS_URL: string;
SIMPLETS_AWS_WORKER_LAMBDA_NAME: string;
```

## Contract versioning

The underlying smart contracts is versioned such that if there are ever new
breaking changes introduces to the smart contract, it will not break the
interaction with previously deployed contract.
For each contract type and corresponding chain type, there is an entry in
the `contract_version` table which contains all the versions for that contract
and chain type. By default, when creating a new collection, the highest version
is considered.

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
