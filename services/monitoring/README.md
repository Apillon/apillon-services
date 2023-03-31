# Apillon Logging, Monitoring & Alerting Service - LMAS

Purpose of this service is to provide endpoint for logging system messages to Mongo database and to notify administrators of system events.

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
 /************************************************************
   * LMAS -  Apillon Logging, Monitoring & Alerting Service
   ************************************************************/
  /**
   *  function name
   */
  MONITORING_FUNCTION_NAME: string;
  MONITORING_FUNCTION_NAME_TEST: string;
  /**
   * LMAS dev server port
   */
  MONITORING_SOCKET_PORT: number;
  MONITORING_SOCKET_PORT_TEST: number;
  /**
   * LMAS MongoDB connection string
   */
  MONITORING_MONGO_SRV: string;
  MONITORING_MONGO_DATABASE: string;
  MONITORING_MONGO_SRV_TEST: string;
  MONITORING_MONGO_DATABASE_TEST: string;

  /**
   * SLACK ALERTS
   */
  SLACK_TOKEN: string;
  SLACK_CHANNEL: string;
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
