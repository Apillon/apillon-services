# Apillon public API

This public API is intended for Apillon users to consume it with use of their API Keys. The API can be called using Apillon SDK, CLI or with direct HTTP calls.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Documentation](#documentation)
3. [Configuration](#configuration)
4. [Environments](#environments)
5. [Requests](#requests)
6. [Authentication and authorization](#authentication-and-authorization)
7. [Deployment](#deployment)
8. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the API locally.

## Documentation

Public documentation of endpoints and all available API modules is available at [https://wiki.apillon.io/build/1-apillon-api.html](https://wiki.apillon.io/build/1-apillon-api.html)

## Configuration

Public API uses configuration of other services in the system on the current environment, mainly from the `@apillon/dev-console-api`. -> [Go to Dev Console API docs](../dev-console-api/README.md#configuration)

## Environments

List of URLs the API is available at:

| Environment | URL                               |
| ----------- | --------------------------------- |
| Production  | <https://api.apillon.io/>         |

## Requests

The server speaks [JSON](https://en.wikipedia.org/wiki/JSON). It is recommended that every call to the server includes a `Content-Type` header set to `application/json;`.

## Authentication and authorization

API routes restrict public access and require authentication.

Requests must include a basic auth HTTP header field in the form of

```ssh
Authorization: Basic <credentials>
```

Credentials represent the Base64 encoding of API key and API key secret joined by a single colon (`:`).

API keys could be generated on the developer dashboard under `Project settings`.

Authorization is checked at the endpoint level in controller. Required permissions are defined with `@ApiKeyPermissions` decorator. Example:

```ts
@ApiKeyPermissions({
  role: DefaultApiKeyRole.KEY_EXECUTE,
  serviceType: AttachedServiceType.STORAGE,
})
@UseGuards(AuthGuard)
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved.
