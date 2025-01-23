# Adding Support for New Chains - Documentation

This document outlines the steps required to add support for new blockchain
chains in the system, based on the example implementation of supporting Base and
Base Sepolia chains.

---

## **Overview of Changes**

To add support for a new chain, follow these steps to ensure the chain is
properly integrated and functional within the existing architecture.

---

## **Step-by-Step Guide**

### 1. **Add Chain to the EvmChain Enum**

- Extend the appropriate enums to define the chain IDs for the new chain(s). For
  example:
  - `EvmChain` enum for Ethereum Virtual Machine (EVM)-based chains.
  - Other chain types as required.

Example:

```typescript
export enum EvmChain {
  BASE = 8453,
  BASE_SEPOLIA = 84532,
}
```

[packages/lib/src/config/types.ts](../packages/lib/src/config/types.ts)

---

### 2. **Mark Chains as Enterprise User only**

Add chain to enterprise users constant which will prevent non enterprise users
to use them.

Example:

```typescript
export const ENTERPRISE_USER_EVM_CHAINS = [
  EvmChain.BASE,
  EvmChain.BASE_SEPOLIA,
];
```

[packages/lib/src/config/types.ts](../packages/lib/src/config/types.ts)

---

### 3. **Add product codes**

Add product codes to `ProductCode` for new chains. ProductCodes are unique per
chain to allow different billing for each chain.

Example:

```typescript
export enum ProductCode {
  CONTRACT_BASE_CREATE = 61,
  CONTRACT_BASE_CALL = 62,
  CONTRACT_BASE_SEPOLIA_CREATE = 63,
  CONTRACT_BASE_SEPOLIA_CALL = 64,

  NFT_BASE_COLLECTION = 65,
  NFT_BASE_MINT = 66,
  NFT_BASE_BURN = 67,
  NFT_BASE_TRANSFER_COLLECTION = 68,
  NFT_BASE_SET_BASE_URI = 69,
}
```

[packages/lib/src/config/types.ts](../packages/lib/src/config/types.ts)

---

### 4. **Tokens and Native Currency Support**

- Update the token mapping utilities to include the native currencies for the
  new chain.

Example:

```typescript
[EvmChain.BASE]
:
TxToken.BASE_TOKEN,
  [EvmChain.BASE_SEPOLIA]
:
TxToken.BASE_SEPOLIA_TOKEN,
```

[services/blockchain/src/lib/utils.ts](../services/blockchain/src/lib/utils.ts)

---

### 4. **Tokens and Native Currency Support**

- Define the native tokens used by each chain.

Example:

```typescript
export enum TxToken {
  BASE_TOKEN = 'BASE',
  BASE_SEPOLIA_TOKEN = 'SepoliaETH',
}
```

[services/blockchain/src/config/types.ts](../services/blockchain/src/config/types.ts)

- Update the token/chain mapping to include tokens for the new chain.

Example:

```typescript
[EvmChain.BASE]
:
TxToken.BASE_TOKEN,
  [EvmChain.BASE_SEPOLIA]
:
TxToken.BASE_SEPOLIA_TOKEN,
```

[services/blockchain/src/lib/utils.ts](../services/blockchain/src/lib/utils.ts)

---

### 5. **Update Workers Map**

```services/blockchain/src/lib/helpers.ts```

- Add support for the chain in worker map helper functions, such as utilities
  for transmitting and verifying transactions. Update worker names if needed.

Example:

```typescript
case
EvmChain.BASE
:
return type == WorkerType.TRANSMIT
  ? WorkerName.TRANSMIT_BASE_TRANSACTIONS
  : WorkerName.VERIFY_BASE_TRANSACTIONS;
```

[services/blockchain/src/lib/helpers.ts](../services/blockchain/src/lib/helpers.ts)

---

### 6. **Database Migration Scripts**

To properly seed the necessary configurations for the new chain:

1. **Endpoints**

- Add a migration script to seed the endpoint(s) for the chain.

Example:
[services/blockchain/src/migration-scripts/seeds/1734956164850-base-endpoints.ts](../services/blockchain/src/migration-scripts/seeds/1734956164850-base-endpoints.ts)

2. **Jobs**

- Update the jobs table to include tasks for transmitting and verifying
  transaction workers for the chain.

Example:
[services/blockchain/src/migration-scripts/seeds/1734956185989-base-jobs.ts](../services/blockchain/src/migration-scripts/seeds/1734956185989-base-jobs.ts)

3. **Product and Pricing for Services**

- Add new products (`PRODUCT` table) that correspond to the operations (e.g.,
  mint, burn) for the chain.
- Add pricing details (`PRODUCT_PRICE` table) for each product.

Example:

[services/config/src/migration-scripts/seeds/1734958240163-seed-contracts-base-chains-product-and-price.ts](../services/config/src/migration-scripts/seeds/1734958240163-seed-contracts-base-chains-product-and-price.ts)
[services/config/src/migration-scripts/seeds/1734960273051-seed-nfts-base-chain-product-and-price.ts](../services/config/src/migration-scripts/seeds/1734960273051-seed-nfts-base-chain-product-and-price.ts)

---

### 7. **Worker Configuration**

1. Add worker definitions for the new chain in `worker-executor.ts`.
2. Define transmit and verify workers for the new chain.

Example:

```typescript
case
WorkerName.TRANSMIT_BASE_TRANSACTIONS
:
await new TransmitEvmTransactionWorker(...).run();
```

[services/blockchain/src/workers/worker-executor.ts](../services/blockchain/src/workers/worker-executor.ts)

---

### 8. **Add Environment Variables**

- Add environment variables for the new chain (GraphQL server endpoints) to the
  `env.ts` file.

Example:

```typescript
BLOCKCHAIN_BASE_GRAPHQL_SERVER: process.env['BLOCKCHAIN_BASE_GRAPHQL_SERVER'];
BLOCKCHAIN_BASE_SEPOLIA_GRAPHQL_SERVER: process.env['BLOCKCHAIN_BASE_SEPOLIA_GRAPHQL_SERVER'];
```

[packages/lib/src/config/env.ts](../packages/lib/src/config/env.ts)

---

### 9. **Extend Services**

- Update service files for each module to include logic for the new chain.
- Example modules: smart contracts, NFTs.
- These updates typically include adding the chain to existing mappings or
  business logic for supported features.

Example changes:

- Add support for contract operations.
  [services/contracts/src/modules/contracts/services/contracts-spend-service.ts](../services/contracts/src/modules/contracts/services/contracts-spend-service.ts)
- Include the chain in modules like NFT collections, minting, burning, and other
  functionalities.
  [services/nfts/src/modules/nfts/nfts.service.ts](../services/nfts/src/modules/nfts/nfts.service.ts)

---

By following the example process, any new chain can be efficiently supported
within the system while maintaining compatibility with the existing design.
