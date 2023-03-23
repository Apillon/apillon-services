import * as middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import {
  InitializeContextAndFillUser,
  MySqlConnect,
  ResponseFormat,
  ErrorHandler,
} from '@apillon/service-lib';
import { AppEnvironment, env } from '@apillon/lib';

const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  console.log(event);

  const res = await processEvent(event, context.serviceContext);
  console.log('LAMBDA RESPONSE');
  console.log(res);
  return res;
};

const connectionParams = {
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
};

// exposing lambda handler and setup middlewares
export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect(connectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
