import middy from '@middy/core';
import { env } from 'at-sdk';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { MongoDbConnect } from './middleware/mongoDb';

const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};

export const handler = middy(lambdaHandler);
handler.use(
  MongoDbConnect({
    connectionString: env.AT_LMAS_MONGO_SRV,
    database: env.AT_LMAS_MONGO_DATABASE,
    autoDisconnect: true,
  }),
);
