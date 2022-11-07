import * as middy from '@middy/core';
import { AppEnvironment, env } from '@apillon/lib';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MongoDbConnect } from './middleware/mongoDb';
import { ResponseFormat } from './middleware/response';

const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};

export const handler = middy.default(lambdaHandler);
handler
  .use(
    MongoDbConnect({
      connectionString:
        env.APP_ENV === AppEnvironment.TEST
          ? env.MONITORING_MONGO_SRV_TEST
          : env.MONITORING_MONGO_SRV,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.MONITORING_MONGO_DATABASE_TEST
          : env.MONITORING_MONGO_DATABASE,
      autoDisconnect: true,
    }),
  )
  .use(ResponseFormat())
  .use(ErrorHandler());
