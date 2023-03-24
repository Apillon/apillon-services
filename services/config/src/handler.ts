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

export const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context.serviceContext);
};

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

export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect(connectionParams))
  .use(ResponseFormat())
  .use(ErrorHandler());
