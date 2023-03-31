# Apillon Services

In this repository you will find source for microservices, APIs and libraries that form Apillon Web3 platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Working with Turborepo](#working-with-turborepo)
5. [Documentation](#documentation)
6. [License](#license)
7. [Authors](#authors)

## Prerequisites

- Node.js v16.17.0 or higher
- npm v8.4.0 or higher
- Turborepo

## Installation

This monorepo project is configured to run with `npm` and `turborepo` build system (<https://turborepo.org/docs>). For deployment to AWS `serverless` framework is used (<https://serverless.com/docs>)

### Environment variables

Local ENV variables should be stored in `.env` file inside root folder! **`.env` file must not be committed to git!**

### Developing in VS Code Workspaces

Run VS Code by opening `at.code-workspace` file to have workspaces setup. File should be updated if new workspaces are added to project. There could also be multiple workspace files if needed.

## Getting Started

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

Please see detailed instructions for development, debugging and testing here:

- [Development docs](/docs/development.md)
- [Debug & test docs](/docs/debug-and-test.md)

### Deploy

To manually deploy changes from local to development environment on AWS use:

```sh
npm run deploy:dev
```

Code should not be deployed to other environments from local machine. Deployment is automatically preformed on AWS Codebuild from `develop`, `stage` and `master` branches to `dev`, `staging` and `production` environment respectively.

Please see detailed documentation for deploying:

- [Deployment docs](/docs/deployment.md)

#### Environment variables on the cloud

Variables are loaded from S3 on build time. See `./bin/deploy/aws-build.sh`. Before build there should be updated version of variables on S3.

Majority of variables and secrets for cloud environments are also stored in AWS Secret manager.

## Working with Turborepo

Turbo repo settings: `turbo.json`

Read more about pipeline setup:

- [Pipelines](https://turborepo.org/docs/core-concepts/pipelines)

References to other Turborepo documentation:

- [Caching](https://turborepo.org/docs/core-concepts/caching)
- [Remote Caching](https://turborepo.org/docs/core-concepts/remote-caching)
- [Scoped Tasks](https://turborepo.org/docs/core-concepts/scopes)
- [Configuration Options](https://turborepo.org/docs/reference/configuration)
- [CLI Usage](https://turborepo.org/docs/reference/command-line-reference)

## Documentation

| Resource                                        | Description                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| [Development](docs/development.md)              | Basic guide to programming apillon services                           |
| [Rest API](docs/rest-API-specs.md)              | Some basic information about request, response ...                    |
| [DB migrations](docs/db-migrations.md)          | Docs of how to perform mysql db migrations for services & API modules |
| [Debugging and testing](docs/debug-and-test.md) | How to debug services and how execute e2e tests                       |
| [Deployment](docs/deployment.md)                | Service deployment to AWS                                             |

## License

Copyright (c) Apillon 2022 - All Rights Reserved

## Authors

| Name         | Role                     | Email                   |
| ------------ | ------------------------ | ----------------------- |
| Tadej Vengust| Tech Lead                | tadej@kalmia.si         |
| Tine Mlakar  | Architect & DevOps       | tine@kalmia.si          |
| Vinko Šmid   | Project lead             | vinko.smid@kalmia.si    |
| Luka Golinar | Developer                | luka.golinar@kalmia.si  |
| Matic Kolar  | Developer                |                         |
| Urban Kovač  | Frontend Developer       | urban.kovac@kalmia.si   |
