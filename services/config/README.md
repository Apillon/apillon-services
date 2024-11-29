# Apillon System Configuration Service - SCS

SCS is providing various system wide configuration parameters. One of the key features is that service holds user subscriptions and user quotas for limiting use of different Apillon services, as well as credit amounts for all projects.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Quotas

The configuration microservice contains definitions for quotas, including global, per-user, per-project or per-object quotas. The current app quotas are stored in the quotas table and contain the default quota values for different types of services, e.g. the number of max projects a user can own, number of users on a project, max number of buckets on a project and more. Following is an example of how to obtain a quota for the maximum number of websites a project can own:

<br>
```ts
const maxWebsitesQuota = await new Scs(context).getQuota({
  quota_id: QuotaCode.MAX_WEBSITES,
  project_uuid: website.project_uuid,
});
```
<br>

Everywhere in the code where a new object is being created or added to a project, the quotas are checked and an error is thrown if the amount exceeds the quota limit.

There are three quota types:

- Object-related quotas:

  - Number of max projects owned by user.

- Project-related quotas:

  - Number of max users on single project
  - Max number of API keys on project
  - Max number of buckets for web hosting
  - Max number of buckets for file hosting
  - Max count of attested users
  - Max number of web pages inside project
  - Max number of NFT collections per project

- Project-and-object-related quotas:
  - Max size of all files uploaded to bucket (specific for buckets inside a project)

Depending on the quota type we need to pass parameters to the getQuota endpoint, whether that is object_uuid, project_uuid or both.

### Overrides

Alongside quotas in the application there also exist quota overrides, which are meant to overrule a quota value for a specific project, user or object. Overrides can be edited by admin users in the admin panel.
Each override contains a quota_id, project_uuid, object_uuid, value and description. The object_uuid can be used to override user-related or other object-related quotas, for example buckets.
When querying for a particular quota or a list of quotas, the override values related to a quota have precedence over the quota value - meaning that if an override exists for the quota and the project/object, its value is taken into consideration instead of the quota value.

Quotas have two kinds of value types (determined by the valueType column) - 1 (MAX) or 2 (MIN). If the valueType is 1, the higher value between the quota value and override value is considered. If the valueType is 2, the lower value between the quota value and override value is considered.

### Subscriptions & Subscription Packages

Subscriptions are meant to offer higher project limits depending on which package a project is subscribed to. They are meant to upgrade limits for recurring costs, such as storage and bandwidth.
Users can subscribe to existing subscription packages defined in the subscriptionPackage table. For each package, there exist overrides for each quota which define the limits a project can reach when being subscribed
to a particular package. Subscription payment is handled through Stripe and a new subscription record is inserted in the database, denoting that project currently has an active subscription,
as well as an invoice, serving as a proof of payment and containing customer data. The quota overrides stop being valid for a subscription when the 'expiresOn' property is more than 1 day in the past.
A subscription can be canceled through the Stripe customer portal, meaning that it will not be renewed. The quota overrides are still valid until a subscription is not expired, even if it has been cancelled.

### Credits & Credit Packages

Unlike subscriptions, credits are used to pay for actions and services which are not a recurring cost, for example creating an NFT collection, deploying a website, creating a Kilt identity and so on.
Credits can be obtained by purchasing a credit package, all of which are stored in the creditPackage table. Each package grants a fixed number of credits,
as well as bonus credits when purchasing a higher-level package. Subscriptions also provide users with a certain amount of credits, however only when a project subscribes to a package for the first time.
When a fixed-cost action is executed, a project's credit balance is reduced by the credit cost of that action. If the action is asynchronous (e.g. deploy NFT collection) and the action fails later on,
the credit cost is refunded to the project's balance. For each credit action (deposit or spend), a new creditTransaction record is created, as well as an invoice record when purchasing a package.

All current existing actions for spending credits are defined in the 'product' table, while their respective credit costs (prices) are defined in the productPrice table.

## Configuration

Environment variables that have to be set:

```ts
/*************************************************************
 * SCS - Apillon System Configuration Service
 *************************************************************/
/**
 *  function name
 */
CONFIG_FUNCTION_NAME: string;
CONFIG_FUNCTION_NAME_TEST: string;

/**
 * SCS dev server port
 */
CONFIG_SOCKET_PORT: number;
CONFIG_SOCKET_PORT_TEST: number;

/**
 * SCS Database config
 */

CONFIG_MYSQL_HOST: string;
CONFIG_MYSQL_PORT: number;
CONFIG_MYSQL_DATABASE: string;
CONFIG_MYSQL_USER: string;
CONFIG_MYSQL_PASSWORD: string;
CONFIG_MYSQL_DEPLOY_USER: string;
CONFIG_MYSQL_DEPLOY_PASSWORD: string;

CONFIG_MYSQL_HOST_TEST: string;
CONFIG_MYSQL_PORT_TEST: number;
CONFIG_MYSQL_DATABASE_TEST: string;
CONFIG_MYSQL_USER_TEST: string;
CONFIG_MYSQL_PASSWORD_TEST: string;

/**
 * Expired subscriptions worker
 */
STORAGE_AWS_WORKER_SQS_URL: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
