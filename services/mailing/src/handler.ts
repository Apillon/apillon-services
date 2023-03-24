import {
  ErrorHandler,
  InitializeContextAndFillUser,
  ResponseFormat,
} from '@apillon/service-lib';
import * as middy from '@middy/core';
import type { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

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
