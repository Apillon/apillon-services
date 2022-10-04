import middy from '@middy/core';
import { AppEnvironment, env } from 'at-lib';
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

export const handler = middy(lambdaHandler);
handler
  .use(
    MongoDbConnect({
      connectionString:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_LMAS_MONGO_SRV_TEST
          : env.AT_LMAS_MONGO_SRV,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_LMAS_MONGO_DATABASE_TEST
          : env.AT_LMAS_MONGO_DATABASE,
      autoDisconnect: true,
    }),
  )
  .use(ResponseFormat())
  .use(ErrorHandler());
