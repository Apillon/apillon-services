# Apillon Social Service - SUBS

The social microservice is utilizing the Subsocial parachain for access to decentralized social applications. The current implementation supports Grill.chat for creating spaces and posts within spaces on grill.chat, as well as provides premade code to integrate a chat widget anywhere.

Subsocial is a set of Substrate pallets that allows anyone to launch their own decentralized social network or community, or add social features to an existing application. Subsocial is not a decentralized social network, like Twitter or Facebook, but rather Subsocial is a platform for building social networks.

Grill.chat is a mobile-friendly, anonymous chat application powered by Subsocial, allowing anyone to communicate on-chain, without needing a wallet or tokens.

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
 * SOCIAL - Apillon Social Service
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
 * Social workers config
 */
SOCIAL_AWS_WORKER_SQS_URL: string;
SOCIAL_AWS_WORKER_LAMBDA_NAME: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
