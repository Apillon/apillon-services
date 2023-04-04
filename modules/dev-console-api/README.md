# Apillon Developer console API

This API is consumed by Apillon Developer Console web application (frontend).

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Environments](#environments)
4. [Requests](#requests)
5. [Authentication and authorization](#authentication-and-authorization)
6. [Deployment](#deployment)
7. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the API locally.

## Configuration

Environment variables that has to be set:

```ts
  /************************************************************
   * DEV-CONSOLE-API -Apillon Developer Console API
   ************************************************************/
  DEV_CONSOLE_API_MYSQL_HOST: string;
  DEV_CONSOLE_API_MYSQL_PORT: number;
  DEV_CONSOLE_API_MYSQL_USER: string;
  DEV_CONSOLE_API_MYSQL_PASSWORD: string;
  DEV_CONSOLE_API_MYSQL_DEPLOY_USER: string;
  DEV_CONSOLE_API_MYSQL_DEPLOY_PASSWORD: string;
  DEV_CONSOLE_API_MYSQL_DATABASE: string;

  DEV_CONSOLE_API_MYSQL_HOST_TEST: string;
  DEV_CONSOLE_API_MYSQL_PORT_TEST: number;
  DEV_CONSOLE_API_MYSQL_USER_TEST: string;
  DEV_CONSOLE_API_MYSQL_PASSWORD_TEST: string;
  DEV_CONSOLE_API_MYSQL_DATABASE_TEST: string;

  DEV_CONSOLE_API_HOST: string;
  DEV_CONSOLE_API_PORT: number;

  DEV_CONSOLE_API_HOST_TEST: string;
  DEV_CONSOLE_API_PORT_TEST: number;


```

## Environments

| Environment | API URL                                   | Frontend URL                              |
| ----------- | ---------------------------------------   | ---------------------------------------   |
| Development | <https://console-api-dev.apillon.io/>     | <https://app-dev.apillon.io/>             |
| Staging     | <https://console-api-staging.apillon.io/> | <https://app-staging.apillon.io/>         |
| Production  | <https://console-api.apillon.io/>         | <https://app.apillon.io/>                 |

## Requests

The server speaks [JSON](https://en.wikipedia.org/wiki/JSON). It is recommended that every call to the server includes a `Content-Type` header set to `application/json;`.

## Authentication and authorization

`AuthGuard` middleware performs authentication and authorization checks.

Except for the login and reset routes, API routes restrict public access and require authentication.
Requests must include a [bearer token](https://swagger.io/docs/specification/authentication/bearer-authentication/). This token can be recieved with call to (`/users/login`) endpoint.

Authorization is checked at the endpoint level in controller. Required permissions are defined with `@Permissions` decorator. Example:

```ts
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved.
