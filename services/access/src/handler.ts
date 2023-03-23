import * as middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MySqlConnect } from './middleware/mysql';
import { ResponseFormat } from './middleware/response';
import { InitializeContextAndFillUser } from './middleware/context-and-user';

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

// exposing lambda handler and setup middlewares
export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
