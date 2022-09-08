# Authtral v2 services

## Setup

Environment:

```ssh
  NODE >= v16.17.0
  NPM >= 8.4.0
```

This monorepo project is configured to run with `npm` and `turborepo` build system (<https://turborepo.org/docs>). For deployment to AWS `serverless` framework is used (<https://serverless.com/docs>)

### Environment variables

Local ENV variables should be stored in `.env` file inside root folder! **`.env` file must not be committed to git!**

### Developing in VS Code Workspaces

Run VS Code by opening `at.code-workspace` file to have workspaces setup. File should be updated if new workspaces are added to project. There could also be multiple workspace files if needed.

## Development

> **All `npm` commands shoud be run in folder of the repo!**

### Installing packages

> All installation should be done in the root folder of the repo!

To install package common to all workspaces (dev dependencies):

```ssh
npm i <package> -D
```

To instal dependency to specific workspace

```ssh
npm i <package> -w=<workspace>
```

for example:

```ssh
npm i lodash -w=dev-console-api
```

more: <https://turborepo.org/docs/guides/workspaces#managing-dependencies>

### Build

To build all apps and packages, run the following command:

```
npm run build
```

### Develop

To develop all apps and packages, run the following command:

```
npm run dev
```

### Deploy

To manually deploy changes from local to development environment on AWS use:

```
npm run deploy:dev
```

Code should not be deployed to other environments from local machine. Deployment is automatically preformed on AWS Codebuild from `develop`, `stage` and `master` branches to `dev`, `staging` and `production` environment respectively.

#### Environment variables on the cloud

Variables are loaded from S3 on build time. See `./bin/deploy/aws-build.sh`. Before build there should be updated version of variables on S3.

## Turborepo

Turbo repo settings: `turbo.json`

Read more about pipeline setup:

- [Pipelines](https://turborepo.org/docs/core-concepts/pipelines)

References to other turborepo documentation:

- [Caching](https://turborepo.org/docs/core-concepts/caching)
- [Remote Caching](https://turborepo.org/docs/core-concepts/remote-caching)
- [Scoped Tasks](https://turborepo.org/docs/core-concepts/scopes)
- [Configuration Options](https://turborepo.org/docs/reference/configuration)
- [CLI Usage](https://turborepo.org/docs/reference/command-line-reference)