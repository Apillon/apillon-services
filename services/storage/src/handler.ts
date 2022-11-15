import middy from '@middy/core';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { InitializeContextAndFillUser } from './middleware/context-and-user';
import { ErrorHandler } from './middleware/error';
import { MySqlConnect } from './middleware/mysql';
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
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
