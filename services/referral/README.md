# Apillon Referral Service - REF

Referral Service provides functionality for user referral program, reward points and gift shop. Users get rewarded for referring other users through their unique referral code and for completing tasks on the platform during different campaigns, for example airdrop campaign.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Configuration

Environment variables that have to be set:

```ts
  /************************************************************
   * REF - Apillon Referral Service
   ************************************************************/

  REFERRAL_FUNCTION_NAME: string;
  REFERRAL_FUNCTION_NAME_TEST: string;
  REFERRAL_SOCKET_PORT: number;
  REFERRAL_SOCKET_PORT_TEST: number;

  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TWITTER_CONSUMER_TOKEN: string;
  TWITTER_CONSUMER_SECRET: string;
  TWITTER_BEARER_TOKEN: string;
  TWITTER_USER_ID: string;
  OUATH_CALLBACK_URL: string;

  REFERRAL_MYSQL_HOST: string;
  REFERRAL_MYSQL_PORT: number;
  REFERRAL_MYSQL_USER: string;
  REFERRAL_MYSQL_PASSWORD: string;
  REFERRAL_MYSQL_DEPLOY_USER: string;
  REFERRAL_MYSQL_DEPLOY_PASSWORD: string;
  REFERRAL_MYSQL_DATABASE: string;

  REFERRAL_MYSQL_HOST_TEST: string;
  REFERRAL_MYSQL_PORT_TEST: number;
  REFERRAL_MYSQL_USER_TEST: string;
  REFERRAL_MYSQL_PASSWORD_TEST: string;
  REFERRAL_MYSQL_DATABASE_TEST: string;

```

## Promo codes

Referral promo codes are stored in the `promo_code` table. The way they work is that they represent a mapping between a referral code (e.g. `WEB3`) and how many credits a user gets for registering with that code.
Promo codes are read from the `REF` query parameter upon user registration through the URL, for example `https://app.apillon.io/register?REF=WEB3`.

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
