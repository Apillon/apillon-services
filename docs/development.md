# Development docs

It is highly recommended to read this docs alogn with [res-API-specs](/docs/rest-API-specs.md) and other .md files inside docs directory before starting programming Apillon services!

## Services and service codes

| Code | Short    | Service name                             | Package name             | path                      |
| ---- | -------- | ---------------------------------------- | ------------------------ | ------------------------- |
| 00   | #        | Apillon Web3 Services                    | @apillon                 | /                         |
| 01   | LIB      | Service Code Library                     | @apillon/lib             | /packages/lib/            |
| 02   | AMS      | Access Management Service                | @apillon/access          | /services/access/         |
| 03   | LMAS     | Logging, Monitoring and Alerting Service | @apillon/monitoring      | /services/monitoring/     |
| 04   | DEV-API  | Developer Console API                    | @apillon/dev-console-api | /modules/dev-console-api/ |
| 05   | AP-API   | Apillon Service API                      | @apillon/apillon-api     | /modules/apillon-api/     |
| 06   | IPFS     | IPFS Storage Service                     | @apillon/storage         | /services/storage/        |
| 07   | AUTH-API | Authentication API                       | @apillon/auth-api        | /modules/auth/            |
| 08   | MAIL     | Mailing Service                          | @apillon/mailing         | /services/mailing/        |
| 09   | MOD-LIB  | Module Code Library                      | @apillon/modules-lib     | /packages/modules-lib/    |
| 10   | SCS      | System Configuration Service             | @apillon/config          | /services/config/         |
| 11   | REF      | Referral program                         | @apillon/referral        | /services/referral/       |
| 12   | NFTS     | NFTS Service                             | @apillon/nfts            | /services/nfts/           |
| 13   | AUTH     | Authentication Service                   | @apillon/auth            | /services/authentication/ |
| 14   | TEST-LIB | Testing Library                          | @apillon/tests-lib       | /packages/tests-lib/      |
| 15   | WORK-LIB | Worker Library                           | @apillon/worker-lib      | /packages/worker-lib/     |

## Error codes

> code format : HTTPCODE | MODULE_CODE | MODULE_INTERNAL_ERROR_CODE

- HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
- MODULE CODE: see service codes
- INTERNAL ERROR CODE: 000 - 999

## Project structure

Project contains multiple workspaces. Basically each service and library should have it's own workspace defined in [apillon.code-workspace](/apillon.code-workspace)

### APIs

- @apillon/dev-console-api is Nest.js API, which is used by Apillon developers console.
- @apillon/apillon-api is Nest.js API, which is used by developers, to integrate Apillon into their applications. See [docs](/modules/apillon-api/docs/apillon-api.md)
- @authentication-api is Nest.js API for KILT, DID, some kind of OAuth xD

### Project libs

- @apillon/lib is minimalistic general library, which include types and functions that are used in all other services. This library shoud contain as little as possible dependencies (other packages).
- @apillon/modules-lib is library for NEST.js APIs. It includes some general middlewares, helpers, interceptors, decorators, ... This library should not be used in microservices (becouse of nest dependencies).
- @apillon/tests-lib is a library, which provides interfaces, classes and functions for testing environment setup and generating data for tests.
- @apillon/workers-lib is a library, which provides types, models and classes for serverless workers. This library can be used in APIs and also in microserices (example of use can be seen in @services/storage, where multiple workers are implemented).

## Setting up new API or microservice

Each service has its unique [code](#services-and-service-codes). First add new code and other informations to above table. Then add new enum values for `ServiceName` and `ServiceCode` in [types.ts](/packages/lib/src/config/types.ts) file inside @apillon/lib.

Easiest way to create new service is to copy existing one, clean it and change it's configuration.
Services runs parallel, so each one of them need to run on separate port (defined in .env).

So far the practice is that every service, has its own database.

### Microservices

Microservices are not build with any framework. Pure Node.js with common.js as target!
Files that ensure the functioning of the microservice:

- scripts/dev/run-server.ts entry point for local development server
- server.ts contain function to start local development socket server
- handler.ts exports labmda handler - here developer can add middlewares

```ts
export const handler = middy(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
```

- main.ts exports `processEvent` function, which based on recieved `eventName` runs microservice function. Each microservice has its own `eventType` enum, defined in [types.ts](/packages/lib/src/config/types.ts). Each MS function should be mapped to value in this enum.

#### How to call microservice

Microservices are deployed as separate lambdas to AWS, but cannot be directly called. Microservices are used by APIs (dev-console-api, apillon-api, ...).

In @packages/lib/src/lib/at-services define new class, which extends [BaseService](/packages/lib/src/lib/at-services/base-service.ts).
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

Services uses two types of logging - logging to console (cloudWatch) and to Mongo DB.

### Logging to console

Logging to console should be done with [writeLog](/packages/lib/src/lib/logger.ts) function.
TODO - implement this function

### Logging with monitoring microservice (LMAS)

In services, call `Lmas().writeLog` function, which supports below parameters:

| Property     | Description                                                                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| context      | Service context. Very important, because it contains requestId, user and other stuff from request                                                                                                                                   |
| user_uuid    | You can directly specify user_uuid, which executes current function. If null, user from context is used                                                                                                                             |
| project_uuid | Project UUID                                                                                                                                                                                                                        |
| logType      | Type of log (error, info, ...)                                                                                                                                                                                                      |
| message      | Log content                                                                                                                                                                                                                         |
| location     | File and functions, which is writing the log                                                                                                                                                                                        |
| service      | `ServiceName`                                                                                                                                                                                                                       |
| data         | Additional data, which holds important information for log. Without this, log is mostly useless. For errors, add whole error object to this property. For some statistical logs, add records that were created, changed, deleted... |

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
