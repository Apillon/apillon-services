import * as middy from '@middy/core';
import { AppEnvironment, env } from '@apillon/lib';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MySqlConnect } from './middleware/mysql';
import { ResponseFormat } from './middleware/response';
import { InitializeContextAndFillUser } from './middleware/context-and-user';

export const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  const res = await processEvent(event, context);
  console.log('LAMBDA RESPONSE');
  console.log(res);
  return res;
};

export const handler = middy.default(lambdaHandler);
handler
  .use(
    MySqlConnect({
      host:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_HOST_TEST
          : env.ACCESS_MYSQL_HOST,
      port:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_PORT_TEST
          : env.ACCESS_MYSQL_PORT,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_DATABASE_TEST
          : env.ACCESS_MYSQL_DATABASE,
      user:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_USER_TEST
          : env.ACCESS_MYSQL_USER,
      password:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_PASSWORD_TEST
          : env.ACCESS_MYSQL_PASSWORD,
      autoDisconnect: true,
    }),
  )
  .use(InitializeContextAndFillUser())
  .use(ResponseFormat())
  .use(ErrorHandler());
