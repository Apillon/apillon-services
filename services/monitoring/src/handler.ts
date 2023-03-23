import { AppEnvironment, env } from '@apillon/lib';
import {
  ErrorHandler,
  MongoDbConnect,
  ResponseFormat,
} from '@apillon/service-lib';
import * as middy from '@middy/core';
import type { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

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

const connectionParams = {
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

export const handler = middy.default(lambdaHandler);
handler //
  .use(MongoDbConnect(connectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
