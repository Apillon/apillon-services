import {
  ErrorHandler,
  InitializeContextAndFillUser,
  MySqlConnect,
  ResponseFormat,
  logLambdaEvent,
} from '@apillon/service-lib';
import * as middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { AppEnvironment, env } from '@apillon/lib';

/**
 * Handles AWS Lambda events and passes them to processEvent() for processing.
 * @param event - Lambda event object.
 * @param context - Lambda execution context.
 * @returns service response
 */
const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  logLambdaEvent(event);

  return await processEvent(event, context.serviceContext);
};

const getConnectionParams = () => {
  return {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MAILING_MYSQL_HOST_TEST
        : env.MAILING_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MAILING_MYSQL_PORT_TEST
        : env.MAILING_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MAILING_MYSQL_DATABASE_TEST
        : env.MAILING_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MAILING_MYSQL_USER_TEST
        : env.MAILING_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MAILING_MYSQL_PASSWORD_TEST
        : env.MAILING_MYSQL_PASSWORD,
  };
};

/**
 *  Exposes the Lambda handler and sets up middleware functions to run before and after the processEvent() function is called.
 */
export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect(getConnectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
