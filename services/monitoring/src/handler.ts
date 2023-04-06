import { AppEnvironment, env } from '@apillon/lib';
import {
  ErrorHandler,
  MongoDbConnect,
  ResponseFormat,
} from '@apillon/service-lib';
import * as middy from '@middy/core';
import type { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

/**
 * Handles AWS Lambda events and passes them to processEvent() for processing.
 * @param event - Lambda event object.
 * @param context - Lambda execution context.
 * @returns service response
 */
const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  //TODO: handle security token and remove it form event.

  // remove security token
  delete event.securityToken;
  console.log(event);

  return await processEvent(event, context);
};

/**
 * An object containing connection parameters for a MongoDB database.
 */
const getConnectionParams = () => {
  return {
    connectionString:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MONITORING_MONGO_SRV_TEST
        : env.MONITORING_MONGO_SRV,
    database:
      env.APP_ENV === AppEnvironment.TEST
        ? env.MONITORING_MONGO_DATABASE_TEST
        : env.MONITORING_MONGO_DATABASE,
    poolSize: 10,
  };
};

/**
 *  Exposes the Lambda handler and sets up middleware functions to run before and after the processEvent() function is called.
 */
export const handler = middy.default(lambdaHandler);
handler //
  .use(MongoDbConnect(getConnectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
