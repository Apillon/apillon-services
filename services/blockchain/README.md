# Apillon Blockchain Integration Service - BCS

BCS is handling communication between Apillon system services and APIs with different blockchain networks. Its job is to send and store transaction and monitor status of transactions on blockchain.

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
 * BCS - Apillon Blockchain Integration Service
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

BLOCKCHAIN_SECRETS: string;

/************************************************************
 * Workers
 ************************************************************/
STORAGE_AWS_WORKER_SQS_URL: string;
AUTH_AWS_WORKER_SQS_URL: string;
COMPUTING_AWS_WORKER_SQS_URL: string;
SOCIAL_AWS_WORKER_SQS_URL: string;
NFTS_AWS_WORKER_SQS_URL: string;

/************************************************************
 * Indexers
 ************************************************************/
BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER: string;
BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER: string;
BLOCKCHAIN_ASTAR_GRAPHQL_SERVER: string;
BLOCKCHAIN_ASTAR_SUBSTRATE_GRAPHQL_SERVER: string;
BLOCKCHAIN_ETHEREUM_GRAPHQL_SERVER: string;
BLOCKCHAIN_SEPOLIA_GRAPHQL_SERVER: string;
BLOCKCHAIN_CELO_ALFAJORES_GRAPHQL_SERVER: string;
BLOCKCHAIN_CELO_GRAPHQL_SERVER: string;
BLOCKCHAIN_ACURAST_GRAPHQL_SERVER: string;
BLOCKCHAIN_CRUST_GRAPHQL_SERVER: string;
BLOCKCHAIN_KILT_GRAPHQL_SERVER: string;
BLOCKCHAIN_PHALA_GRAPHQL_SERVER: string;
BLOCKCHAIN_SUBSOCIAL_GRAPHQL_SERVER: string;
BLOCKCHAIN_UNIQUE_GRAPHQL_SERVER: string;

/************************************************************
 * Oasis
 ************************************************************/
OASIS_SIGNING_WALLET: string;
OASIS_MESSAGE_GAS_LIMIT: number;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## Structure

### Modules

- **Accounting**
- **Blockchain-indexers** -> Updates transactions
- **Evm**
- **Substrate**
- **Wallet**

#### Substrate

Contains the substrate service, which is responsible for creating and storing transactions into the database, based on the rawTransaction provided by the caller. It also takes care for transmitting transactions to the blockchain, depending on the chainId provided (Currently supported: Crust, Kilt, Phala, Subsocial)

#### EVM

The EVM module is responsible for creating, storing, and transmitting transactions on Ethereum-compatible blockchain networks. It handles interactions with smart contracts and manages Ethereum transaction lifecycle, ensuring successful execution on the network. Supported chains are currently Astar and Moonbeam

#### Wallet

The Wallet module manages cryptocurrency wallets and their interactions with various blockchain networks. It supports functionalities such as creating wallets, managing private keys, and signing transactions. This module ensures secure management and operation of blockchain assets.

#### **Blockchain-indexers**

Are divided into **Substrate** and **EVM**

**Substrate** indexers contain base files at the root of the folder. All common functions should be added to these files.

- **base-blockchain-indexer.ts** - is the abstract class, that implemenets the necessary functions of each substrate indexer such as **getAllTransactions**, **getAllSystemEvents**, **getBlockHeight**, **setGraphQlUrl** etc.
- **base-queries.ts** - Implements the basic queries that are common for all the substrate indexers. Chain specific queries should be defined in chain-queries.ts file or the likes, and should extend base queries.

```ts
export class KiltGQLQueries extends BaseGQLQueries {
  ...
  static ACCOUNT_TRANSACTION_BY_HASH = `
    query getAccountTransactionsByHash($address: String!, $extrinsicHash: String!) {
      attestations(where: {account_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
      dids(where: {account_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
      transfers(where: {from_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
      systems(where: {account_eq: $address, extrinsicHash_eq: $extrinsicHash}) {
        extrinsicHash
      }
    }
  `;
  ...
}
```

- **base-transaction-model.ts** - Contains the BaseTransaction model, which must be extended in each respective model, such as

```ts
export interface DidTransaction extends BaseTransaction {
  readonly didId?: string | undefined;
  readonly account?: string | undefined;
}
```

Example provided from Kilt.

### Workers

- **substrate-transaction-worker** - The transmit substrate and evm transaction workers are single threded workers, that are executed either via an sqs message or run at an interval (check serverless.yml). They run the transmit transaction function inside evm / substrate.service and transmit all pending transaction in the database.
- **transmit-substrate-transaction-worker** - The substrate-transaction-worker runs at an interval of 1 minute and fetches all transactions from the blockchain indexers, on a different repo. GraphQL nodes query-nodes are running on an EC2 machine (each per environmnt - dev, stage, production). The transactions are then updated, depending on the state received from the indexer. Only SystemEvents types are necessary to match to the transaction hash, since each extrinsic will always trigger either a SystemSuccess or SystemFailed event.
- **transaction-log-worker** - The substrate log worker runs exactly the same as the update worker, but updates wallet balances and takes care of transaction accounting which includes tracking wallet deposits, their leftover balance, their price per unit and the cost of each transaction.
- **transmit-evm-transaction-worker** - Similar to the substrate-transaction-worker, this worker handles the transmission of EVM-based transactions. It monitors the transaction pool for pending transactions, broadcasts them to the Ethereum network, and updates their status upon confirmation or failure.

### worker-executor

Takes care to execute correct workers based on event type - lambda event, or sqs message event.

## Flow

1. **Transmit** - A caller, let's say the authentication microservice, creates a blockchain service request - it passes in a serialized transaction (the raw transaction hash), a reference table and reference id, and optionally some arbitrary data, which can be returned to the calling service. The reference fields point to the table and the row number of the microservice and is needed when an update is triggered. The blockchain service then creates its own entry of the transaction-request, and transmits the transaction to the blockchain.
2. **Update** - Once the transaction was sucessfully transmited (we call this propagation), the blockchain service waits for a response from the blockchain - either the transction was successfull, or it failed. The substrate-transaction-worker is in charge of this. It fetches all the transactions from the relevant blockchain indexer, then updates the state of the hash inside the transaction database. This step is performed by the substrate-transaction-worker.
3. **Trigger webhook** - This steps triggers the webhook, as defined in the **substrate-parachain.ts (ParachainConfig)** file. This is performed by the substrate-transaction-worker.
4. In parellel, **transaction-log** worker again fetches all the transactions from the blockchain indexer and updates the wallet balances.

![Flow](images/bcs_flow.png 'Flow')

## License

Copyright (c) Apillon - all rights reserved
