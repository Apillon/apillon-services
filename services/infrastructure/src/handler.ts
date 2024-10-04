import { AppEnvironment, env } from '@apillon/lib';
import {
  InitializeContextAndFillUser,
  MySqlConnect,
  ResponseFormat,
  ErrorHandler,
  logLambdaEvent,
} from '@apillon/service-lib';
import middy from '@middy/core';
import { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

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

/**
 * An object containing connection parameters for a MySQL database.
 */
const getConnectionParams = () => {
  return {
    host:
      env.APP_ENV === AppEnvironment.TEST
        ? env.INFRASTRUCTURE_MYSQL_HOST_TEST
        : env.INFRASTRUCTURE_MYSQL_HOST,
    port:
      env.APP_ENV === AppEnvironment.TEST
        ? env.INFRASTRUCTURE_MYSQL_PORT_TEST
        : env.INFRASTRUCTURE_MYSQL_PORT,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.INFRASTRUCTURE_MYSQL_DATABASE_TEST
        : env.INFRASTRUCTURE_MYSQL_DATABASE,
    user:
      env.APP_ENV === AppEnvironment.TEST
        ? env.INFRASTRUCTURE_MYSQL_USER_TEST
        : env.INFRASTRUCTURE_MYSQL_USER,
    password:
      env.APP_ENV === AppEnvironment.TEST
        ? env.INFRASTRUCTURE_MYSQL_PASSWORD_TEST
        : env.INFRASTRUCTURE_MYSQL_PASSWORD,
  };
};

export const handler = middy(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect(getConnectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
