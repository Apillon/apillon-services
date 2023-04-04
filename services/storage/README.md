# Apillon IPFS Storage Service - IPFS

IPFS service provides endpoint for uploading and managing user's files. User files are stored into "bucket" virtual folder. Files from buckets are eventually stored to IPFS node and distributed on Crust network. Buckets can also be used for hosting static web pages on IPFS network.

Storage service also uses background worker processes for uploading to IPFS nodes and communicating with Crust blockchain.

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
   * IPFS - Apillon Storage Service
   ************************************************************/
  STORAGE_FUNCTION_NAME: string;
  STORAGE_FUNCTION_NAME_TEST: string;
  STORAGE_SOCKET_PORT: number;
  STORAGE_SOCKET_PORT_TEST: number;
  STORAGE_CRUST_SEED_PHRASE: string;
  STORAGE_CRUST_SEED_PHRASE_TEST: string;
  STORAGE_AWS_IPFS_QUEUE_BUCKET: string;
  STORAGE_IPFS_API: string;
  STORAGE_IPFS_GATEWAY: string;
  STORAGE_DELETE_AFTER_INTERVAL: number;

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
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
