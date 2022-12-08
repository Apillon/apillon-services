import middy from '@middy/core';
import { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
// import { InitializeContextAndFillUser } from './middleware/context-and-user';
import { ErrorHandler } from './middlewares/error';
import { MySqlConnect } from './middlewares/mysql';
import { ResponseFormat } from './middlewares/response';

const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context.serviceContext);
};

export const handler = middy(lambdaHandler);
handler
  //   .use(InitializeContextAndFillUser())
  .use(MySqlConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
