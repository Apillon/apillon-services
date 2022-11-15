import * as middy from '@middy/core';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MySqlConnect } from './middleware/mysql';
import { ResponseFormat } from './middleware/response';
import { InitializeContextAndFillUser } from './middleware/context-and-user';

export const lambdaHandler: Handler = async (
  event: any,
  _context: Context,
  _callback: Callback,
) => {
  console.log(event);

  const res = await processEvent(event, event.serviceContext);
  console.log('LAMBDA RESPONSE');
  console.log(res);
  return res;
};

export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
