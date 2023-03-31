import { AppEnvironment, env } from '@apillon/lib';
import {
  ErrorHandler,
  InitializeContextAndFillUser,
  MySqlConnect,
  ResponseFormat,
} from '@apillon/service-lib';
import * as middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

/**
 * Handles AWS Lambda events and passes them to processEvent() for processing.
 * @param event - Lambda event object.
 * @param context - Lambda execution context.
 * @returns service response
 */
export const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context.serviceContext);
};

/**
 * An object containing connection parameters for a MySQL database.
 */
const connectionParams = {
  host:
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_MYSQL_HOST_TEST
      : env.CONFIG_MYSQL_HOST,
  port:
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_MYSQL_PORT_TEST
      : env.CONFIG_MYSQL_PORT,
  database:
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_MYSQL_DATABASE_TEST
      : env.CONFIG_MYSQL_DATABASE,
  user:
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_MYSQL_USER_TEST
      : env.CONFIG_MYSQL_USER,
  password:
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_MYSQL_PASSWORD_TEST
      : env.CONFIG_MYSQL_PASSWORD,
};

/**
 *  Exposes the Lambda handler and sets up middleware functions to run before and after the processEvent() function is called.
 */
export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect(connectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
