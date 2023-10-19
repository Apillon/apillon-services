# Apillon Blockchain Integration Service - BIS

BIS is handling communication between Apillon system services and APIs with different blockchain networks. It's job is to send and store transaction and monitor status of transactions on blockchain.

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
   * BIS - Apillon Blockchain Integration Service
   ************************************************************/
  BLOCKCHAIN_FUNCTION_NAME: string;
  BLOCKCHAIN_FUNCTION_NAME_TEST: string;
  BLOCKCHAIN_SOCKET_PORT: number;

  BLOCKCHAIN_MYSQL_HOST: string;
  BLOCKCHAIN_MYSQL_PORT: number;
  BLOCKCHAIN_MYSQL_DATABASE: string;
  BLOCKCHAIN_MYSQL_USER: string;
  BLOCKCHAIN_MYSQL_PASSWORD: string;

  BLOCKCHAIN_SOCKET_PORT_TEST: number;
  BLOCKCHAIN_MYSQL_HOST_TEST: string;
  BLOCKCHAIN_MYSQL_PORT_TEST: number;
  BLOCKCHAIN_MYSQL_DATABASE_TEST: string;
  BLOCKCHAIN_MYSQL_USER_TEST: string;
  BLOCKCHAIN_MYSQL_PASSWORD_TEST: string;

  BLOCKCHAIN_AWS_WORKER_SQS_URL: string;
  BLOCKCHAIN_AWS_WORKER_SQS_ARN: string;
  BLOCKCHAIN_AWS_WORKER_LAMBDA_NAME: string;

  BLOCKCHAIN_CRUST_GRAPHQL_SERVER: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## Structure
### Modules
* Accounting
* Blockchain-indexers -> Updates transactions 
* Evm
* Substrate
* Wallet


### Workers
* substrate-transaction-worker
* transmit-substrate-transaction-worker
* transaction-log-worker
* transmit-evm-transaction-worker

The transmit substrate and evm transaction workers are single threded workers, that are executed either via an sqs message or run at an interval (check serverless.yml). They run the transmit transaction function inside evm / substrate.service and transmit all pending transaction in the database.

The substrate-transaction-worker runs at an interval of 1 minute and fetches all transactions from the blockchain indexers, on a different repo. GraphQL nodes query-nodes are running on an EC2 machine (each per environmnt - dev, stage, production).

The substrate log worker runs exactly the same as the update worker, but updates wallet balances (these two should be merged..).


## Typical flow
A caller, let's say the authentication micro-service, creates a blockchain service request - it passes in a serialized transaction, the raw transaction hash, a reference table and reference id, and optionally some arbitrary data. The reference fields point to the table and the row number of the microservice and is needed when an update is triggered. The blockchain service then creates its own entry of the transaction-request, and transmits the transaction to the blockchain. 

Once the transaction was sucessfully transmited (we call this propagation), the blockchain service waits for a response from the blockchain - either the transction was successfull, or it failed. The substrate-transaction-worker is in charge of this. It fetches all the transactions from the relevant blockchain indexer, and triggers the webhook. 

![Flow](relative%20path/to/bcs_flow.png?raw=true "Flow")

## License

Copyright (c) Apillon - all rights reserved