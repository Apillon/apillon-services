# Apillon Access Management Service - AMS

Purpose of this service is to store and provide information and permissions of registered users and API keys.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Microservice](#running-the-microservice)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Contributing](#contributing)
9. [License](#license)
10. [Authors](#authors)

## Getting Started

Please read [Readme](../../README.md), [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Prerequisites

- Node.js v16.17.0 or higher
- npm v8.4.0 or higher
- Turborepo

## Installation

Please read [Readme](../../README.md) on the root of the repository.

## Configuration

Environment variables that has to be set:

```ts
/*************************************************************
   * AMS -Apillon Access Management Service
   *************************************************************/
  /**
   *  function name
   */
  ACCESS_FUNCTION_NAME: string;
  ACCESS_FUNCTION_NAME_TEST: string;

  /**
   * AMS dev server port
   */
  ACCESS_SOCKET_PORT: number;
  ACCESS_SOCKET_PORT_TEST: number;

  /**
   * AMS Database config
   */

  ACCESS_MYSQL_HOST: string;
  ACCESS_MYSQL_PORT: number;
  ACCESS_MYSQL_DATABASE: string;
  ACCESS_MYSQL_USER: string;
  ACCESS_MYSQL_PASSWORD: string;
  ACCESS_MYSQL_DEPLOY_USER: string;
  ACCESS_MYSQL_DEPLOY_PASSWORD: string;

  ACCESS_MYSQL_HOST_TEST: string;
  ACCESS_MYSQL_PORT_TEST: number;
  ACCESS_MYSQL_DATABASE_TEST: string;
  ACCESS_MYSQL_USER_TEST: string;
  ACCESS_MYSQL_PASSWORD_TEST: string;
```

## Running the Microservice

Please read [Debug and Test](../../docs/debug-and-test.md) documentation.

## Testing

Please read [Debug and Test](../../docs/debug-and-test.md) documentation.

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## Contributing

Please read [Development](../../docs/development.md) documentation.

## License

Copyright (c) Apillon - all rights reserved

## Authors

| Name         | Role                     | Email                   |
| ------------ | ------------------------ | ----------------------- |
| Tadej Vengust| Tech Lead                | tadej@kalmia.si         |
| Tine Mlakar  | Architect & DevOps       | tine@kalmia.si          |
| Vinko Šmid   | Project lead             | vinko.smid@kalmia.si    |
| Luka Golinar | Developer                | luka.golinar@kalmia.si  |
| Matic Kolar  | Developer                |                         |
| Urban Kovač  | Frontend Developer       | urban.kovac@kalmia.si   |
