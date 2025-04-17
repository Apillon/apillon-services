# Apillon Deploy Service

Service responsible for deploying static websites and backend solutions.

## Backend Deploy

Service for deploying backend solutions.

### Phala Cloud

Service integrates with Phala Cloud for deployment of Docker containers.
Docker containers are specified in docker-compose.yml file which is passed to
this service for deploy (with associated environment variables).

Note that docker-compose.yml can only contain images that are published on the
docker registry (Docker Hub for now) and this service is not building any docker
images.

#### Custom Docker Images

Preparing a custom docker image involves manually building it, tagging it with
the appropriate version or commit hash, and pushing it to container registry.
Remember that docker image also contains source code that is copied to it during
build process.

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
 * Deploy - Apillon Deploy Service
 ************************************************************/
/**
 *  function name
 */
DEPLOY_FUNCTION_NAME: string;
DEPLOY_FUNCTION_NAME_TEST: string;

/**
 * dev server port
 */
DEPLOY_SOCKET_PORT: number;
DEPLOY_SOCKET_PORT_TEST: number;

/**
 * Database config
 */
DEPLOY_MYSQL_HOST: string;
DEPLOY_MYSQL_PORT: number;
DEPLOY_MYSQL_USER: string;
DEPLOY_MYSQL_PASSWORD: string;
DEPLOY_MYSQL_DEPLOY_USER: string;
DEPLOY_MYSQL_DEPLOY_PASSWORD: string;
DEPLOY_MYSQL_DATABASE: string;

// TEST
DEPLOY_MYSQL_HOST_TEST: string;
DEPLOY_MYSQL_PORT_TEST: number;
DEPLOY_MYSQL_USER_TEST: string;
DEPLOY_MYSQL_PASSWORD_TEST: string;
DEPLOY_MYSQL_DATABASE_TEST: string;

/**
 * Deploy workers config
 */
DEPLOY_AWS_WORKER_SQS_URL: string;
DEPLOY_BUILDER_AWS_WORKER_LAMBDA_NAME: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
