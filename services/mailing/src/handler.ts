import * as middy from '@middy/core';
import type { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { InitializeContextAndFillUser } from './middleware/context-and-user';
import { ErrorHandler } from './middleware/error';
import { ResponseFormat } from './middleware/response';

const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};

export const handler = middy.default(lambdaHandler);
handler //
  .use(InitializeContextAndFillUser())
  .use(ResponseFormat())
  .use(ErrorHandler());
