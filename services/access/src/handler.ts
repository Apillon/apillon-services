import middy from '@middy/core';
import { env } from 'at-lib';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { MySqlConnect } from './middleware/mysql';

export const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};

export const handler = middy(lambdaHandler);
handler.use(
  MySqlConnect({
    host: env.AT_AMS_MYSQL_HOST,
    port: env.AT_AMS_MYSQL_PORT,
    database: env.AT_AMS_MYSQL_DATABASE,
    user: env.AT_AMS_MYSQL_USER,
    password: env.AT_AMS_MYSQL_PASSWORD,
    autoDisconnect: true,
  }),
);
