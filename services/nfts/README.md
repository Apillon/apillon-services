# Apillon NFTs Service - NFTS

NFTs Service provides functionality for creating NFT collections on blockchains. Currently supports Moonbeam network.

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
  NFTS_MOONBEAM_TESTNET_PRIVATEKEY: string;
  NFTS_MOONBEAM_MAINNET_PRIVATEKEY: string;

  /**
   * NFT workers config
   */
  NFTS_AWS_WORKER_SQS_URL: string;
  NFTS_AWS_WORKER_LAMBDA_NAME: string;
```

## NFT Collection Contract versioning
The underlying smart contracts for the NFT Collections are versioned such that if there are ever new breaking changes introduces to the smart contract, it will not break the functionality of previously created collections.
For each collection type, inside of /src/lib/contracts there are 2 folders, abi and bytecode, which contain contract version for each collection type. The latest version for each collection type is stored in the `contract_version` table. For example: If the record for collectionType=1 (name=generic) has value version=3, the files /abi/generic/v3.json and /abi/bytecode/v3.txt will be read when instantiating the smart contract in the NFT service.

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
