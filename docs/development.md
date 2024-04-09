# Apillon Web3 platform - Development documentation

It is highly recommended to read this docs along with [res-API-specs](/docs/rest-API-specs.md) and other .md files inside docs directory before starting programming Apillon services!

## Table of content

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [Project structure](#project-structure)
4. [Creating a new API or microservice](#creating-a-new-api-or-microservice)
5. [Logging](#logging)

## Prerequisites

- Node.js v16.17.0 or higher
- npm v8.4.0 or higher
- Turborepo

## Getting Started

This monorepo project is configured to run with `npm` and `turborepo` build system (<https://turborepo.org/docs>). For deployment to AWS `serverless` framework is used (<https://serverless.com/docs>)

### Environment variables

Local ENV variables should be stored in `.env` file inside root folder! **`.env` file must not be committed to git!**

> **All `npm` commands should be run in root folder of the repo!**

### Installing packages

> All installation should be done in the root folder of the repo!

To install dependencies on all workspaces:

```ssh
npm i
```

To install new package common to all workspaces (only dev dependencies are allowed):

```ssh
npm i <package> -D
```

To instal new package to specific workspace

```ssh
npm i <package> -w=<workspace>
```

for example:

```ssh
npm i lodash -w=@apillon/dev-console-api
```

more: <https://turborepo.org/docs/guides/workspaces#managing-dependencies>

### Build

To build all apps and packages, run the following command:

```sh
npm run build
```

### Develop

To run all apps and packages in develop mode, run the following command:

```sh
npm run dev
```

Please see detailed instructions for debugging and testing here:

- [Debug & test docs](/docs/debug-and-test.md)

### Deploy

To manually deploy changes from local to development environment on AWS use:

```sh
npm run deploy:dev
```

**Code should not be deployed to other environments from local machine.** Deployment is automatically preformed on AWS Codebuild from `develop`, `stage` and `master` branches to `dev`, `staging` and `production` environment respectively.

Please see detailed documentation for deploying:

- [Deployment docs](/docs/deployment.md)

### Working with Turborepo

Turbo repo settings: `turbo.json`

Read more about pipeline setup:

- [Pipelines](https://turborepo.org/docs/core-concepts/pipelines)

References to other Turborepo documentation:

- [Caching](https://turborepo.org/docs/core-concepts/caching)
- [Remote Caching](https://turborepo.org/docs/core-concepts/remote-caching)
- [Scoped Tasks](https://turborepo.org/docs/core-concepts/scopes)
- [Configuration Options](https://turborepo.org/docs/reference/configuration)
- [CLI Usage](https://turborepo.org/docs/reference/command-line-reference)

## Project structure

Project contains multiple workspaces. Each service and library should have it's own workspace defined in [apillon.code-workspace](/apillon.code-workspace)

Please see list of service in [/README.md](/README.md#index-of-services)

### APIs

APIs are built with [Nest.js - a progressive node.js framework](https://nestjs.com/). Check out ther documentation to get familiar with modules, controllers, providers, middlewares, guards,  ...

#### APIs list

| Package | Description | Documentation |
|---------|-------------|---------------|
| `@apillon/dev-console-api` | Nest.js API, which is used by Apillon developers console. | |
| `@apillon/apillon-api` | Nest.js API, which is used by developers, to integrate Apillon into their applications. | [docs](/modules/apillon-api/docs/apillon-api.md) |
| `@apillon/authentication-api` | Nest.js API for Apillon OAuth service. | |

### Code libraries

| Package | Description | Usage |
|---------|-------------|-------|
| `@apillon/lib` | General library, which includes types and functions that are used in many other services and APIs. This library should have minimum dependencies and should be as lean as possible, as it is widely used across services. | * |
| `@apillon/modules-lib` | Library for NEST.js APIs. It includes some general middlewares, helpers, interceptors, decorators, etc. This library should not be used in microservices (because of nest dependencies). | NEST.js APIs |
| `@apillon/service-lib` | Library for microservices. It includes some general middlewares and other common classes for microservices. This library should only be used in microservices. | Microservices |
| `@apillon/tests-lib` | A library, which provides interfaces, classes, and functions for testing environment setup and generating data for tests. | Testing |
| `@apillon/workers-lib` | A library, which provides types, models, and classes for serverless workers. This library can be used in APIs and also in microservices (example of use can be seen in service `@apillon/storage`, where multiple workers are implemented). | APIs and Microservices |

## Creating a new API or microservice

### Developing in VS Code Workspaces

Run VS Code by opening `apillon.code-workspace` file to have workspaces setup. File should be updated if new workspaces are added to project. There could also be multiple workspace files if needed.

### Prepare the framework

Each service has its unique [code](/README.md#index-of-services). First add new code and other information to [this table](README.md#index-of-services). Then add new enum values for `ServiceName` and `ServiceCode` in [types.ts](/packages/lib/src/config/types.ts) file inside @apillon/lib.

Easiest way to create new service is to copy existing one, clean it and change it's configuration.
Services runs parallel, so each one of them need to run on separate port (defined in .env).

### Database

So far the practice is that every service, has its own database. If your service needs a SQL database, you should prepare the migration scripts and connection environment variables. See [DB Migrations](/docs/db-migrations.md) documentation.

### Microservices

Microservices are Node.js programs with common.js as target(!). They are intended to run on AWS Lambda and supposed to be as lightweight as possible (no bloated frameworks included!).

Files that ensure the functioning of the microservice:

- package `@apillon/service-lib` - includes common functions, middlewares and classes for microservices
- `scripts/dev/run-server.ts` entry point for local development server
- `handler.ts` - exports Lambda handler/entry point and defines middlewares with middy framework
- `main.ts` exports `processEvent` function, which based on recieved `eventName` runs microservice function. Each microservice has its own `eventType` enum, defined in [types.ts](/packages/lib/src/config/types.ts). Each MS function should be mapped to value in this enum.

#### How to call microservice

Microservices are deployed as separate lambdas to AWS, but are not exposed to outside of the VPC. Microservices are only used by APIs (dev-console-api, apillon-api, ...) and backend workers.

In `@packages/lib/src/lib/at-services` define new class, which extends [BaseService](/packages/lib/src/lib/at-services/base-service.ts).
That class should then contain methods, to call microservice functions. Below is a simple example, which takes DTO (defined in lib) as parameter, composes data object with `eventName` and other properties, and executes call.

```ts
public async createBucket(params: CreateBucketDto) {
    const data = {
        eventName: StorageEventType.CREATE_BUCKET,
        body: params.serialize(),
    };
    return await this.callService(data);
}

```

## Logging

Services uses two types of logging - logging to console (cloudWatch) and to monitoring service (LMAS) that writes formatted logs to MongoDb.

### Logging to console

Logging to console should be done with [writeLog](/packages/lib/src/lib/logger.ts) function.

### Logging with monitoring microservice (LMAS)

In services, call `Lmas().writeLog` function, which supports below parameters:

| Property     | Description                                                                                                                                      |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| context      | Service context. Very important, because it contains requestId, user and other additional data from the request                                  |
| user_uuid    | You can directly specify user_uuid, which executes current function. If null, user from context is used                                          |
| project_uuid | Project UUID                                                                                                                                     |
| logType      | Type of log (error, info, ...)                                                                                                                   |
| message      | Log content                                                                                                                                      |
| location     | File and functions, where the log is being written from                                                                                          |
| service      | `ServiceName`                                                                                                                                    |
| data         | Additional data, which holds important information about the log. Without this, log is mostly useless. For errors, add whole error object to this property. For some statistical logs, add records that were created, changed, deleted etc. |

**Example:**
```ts
await new Lmas().writeLog({
  context,
  project_uuid: event.body.project_uuid,
  logType: LogType.INFO,
  message: 'New bucket created',
  location: 'BucketService/createBucket',
  service: ServiceName.STORAGE,
  data: bucket.serialize(),
});
```

### Error codes

Error codes have a specific format and structure and are being used for validation or logical errors. Each microservice has its own set of unique error codes and the codes are also mapped on the frontend to translate into user-friendly messages.

**Code format:**
```ts
HTTP_CODE | MODULE_CODE | MODULE_INTERNAL_ERROR_CODE
```

- `HTTP_CODE` = 422 for valdiation, 400 for invalid request, 500 internal error,...
- `MODULE_CODE`: see [Service index](/README.md#index-of-services) for module code!
- `INTERNAL_ERROR_CODE`: 000 - 999
