# Apillon Access Management Service - AMS

This service is to store and provide information about metadata, roles and permissions of registered users and API keys. All parts of the system should query this service for permissions of any non-public actions. Although some of the user data could be duplicated in other services, data provided by this service is considered the most accurate.

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
ACCESS_MYSQL_DEPLOY_USER: string;
ACCESS_MYSQL_DEPLOY_PASSWORD: string;

ACCESS_MYSQL_HOST_TEST: string;
ACCESS_MYSQL_PORT_TEST: number;
ACCESS_MYSQL_DATABASE_TEST: string;
ACCESS_MYSQL_USER_TEST: string;
ACCESS_MYSQL_PASSWORD_TEST: string;

/**
 * Apillon API Integration config
 */

APILLON_API_INTEGRATION_API_KEY: string;
APILLON_API_INTEGRATION_API_SECRET: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright 2022 (c) Apillon - All Rights Reserved
