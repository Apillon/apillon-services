import middy from '@middy/core';
import { AppEnvironment, env } from 'at-lib';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MySqlConnect } from './middleware/mysql';
import { ResponseFormat } from './middleware/response';

export const lambdaHandler: Handler = async (
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
    MySqlConnect({
      host:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_AMS_MYSQL_HOST_TEST
          : env.AT_AMS_MYSQL_HOST,
      port:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_AMS_MYSQL_PORT_TEST
          : env.AT_AMS_MYSQL_PORT,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_AMS_MYSQL_DATABASE_TEST
          : env.AT_AMS_MYSQL_DATABASE,
      user:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_AMS_MYSQL_USER_TEST
          : env.AT_AMS_MYSQL_USER,
      password:
        env.APP_ENV === AppEnvironment.TEST
          ? env.AT_AMS_MYSQL_PASSWORD_TEST
          : env.AT_AMS_MYSQL_PASSWORD,
      autoDisconnect: true,
    }),
  )
  .use(ResponseFormat())
  .use(ErrorHandler());
