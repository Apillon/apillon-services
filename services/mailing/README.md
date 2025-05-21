# Apillon Mailing Service - MAIL

Mailing service is simple service that provides endpoint and templates for sending emails to users. It (currently) doesn't have any database and does not store any data. For sending emails it uses AWS Simple Email Service (AWS SES). Some mails are pre-written with customizable properties (e.g. templates located in `template-data.ts`) while some emails can contain custom data for the subject, content etc.
There is also a deployed lambda for converting an HTML file to a PDF attachment (e.g. for payment invoices) which is utilized through the `GeneratePdfMicroservice` class.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Deployment](#deployment)
4. [Sending Notifications](#sending-notifications)
5. [License](#license)

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Configuration

Environment variables that have to be set:

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

/** Mailerlite */
MAILERLITE_API_KEY: string;

/** Generate PDF */
GENERATE_PDF_FUNCTION_NAME: string;
```

## Deployment

Please read [Deployment](../../docs/deployment.md) documentation.

## Sending notifications

To send a notification using the Mailing microservice, follow the steps below. This guide assumes you are using the Mailing class and the CreateOrUpdateNotificationDto data transfer object (DTO) provided by the service.

### Prerequisites

1. Ensure the Mailing microservice is properly integrated into your project.
2. The context object must be available and contain the necessary user and environment information.
3. The NotificationType enum should include the type of notification you want to send.

### Steps

const mailing = new Mailing(context);

1. **Initialize the Mailing service:**
   - Create an instance of the Mailing class, passing the context object as a parameter. The context should include user details and other relevant information.
````ts
const mailing = new Mailing(context);
````
2. **Create a Notification DTO:**
    - Use the `CreateOrUpdateNotificationDto` class to define the notification details. The populate method is used to set the required fields.
````ts
const notificationDto = new CreateOrUpdateNotificationDto({}, context).populate({
  user_uuid: context.user.user_uuid,
  type: NotificationType.CLOUD_FUNCTION_DEPLOYED,
});
````
3. **Send the notification:**
   - Call the `createNotification` method of the `Mailing̨` instance, passing the populated DTO as an argument.
````ts
await mailing.createNotification(notificationDto);
````

### Notification Types
The `NotificationType` enum defines the types of notifications supported by the Mailing microservice.

**Important:**

If the `NotificationType` enum is updated (e.g., new types are added or existing are modified), ensure the corresponding changes are also made on the frontend. The frontend may use this enum for conditional rendering or other logic related to notifications.


## License

Copyright (c) Apillon - all rights reserved
