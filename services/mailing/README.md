# Apillon Mailing Service - MAIL

Mailing service is simple service that provides endpoint and templates for sending emails to users. It (currently) doesn't have any database and does not store any data. For sending emails it uses AWS Simple Email Service (AWS SES).

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Configuration

Environment variables that has to be set:

```ts
  /************************************************************
   * MAIL - Apillon Mailing Service
   ************************************************************/

  /**
   *  function name
   */
  MAIL_FUNCTION_NAME: string;
  MAIL_FUNCTION_NAME_TEST: string;
  /**
   * LMAS dev server port
   */
  MAIL_SOCKET_PORT: number;
  MAIL_SOCKET_PORT_TEST: number;
  /**/

  /** MAILING */
  MAIL_TEMPLATE_PATH: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USE_SSL: boolean;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  SMTP_NAME_FROM: string;
  SMTP_EMAIL_FROM: string;
  ADMIN_EMAILS: string; // emails for admin notifications
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## License

Copyright (c) Apillon - all rights reserved
