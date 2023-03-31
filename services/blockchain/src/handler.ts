import * as middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MySqlConnect } from './middleware/mysql';
import { ResponseFormat } from './middleware/response';
import { InitializeContextAndFillUser } from './middleware/context-and-user';

/**
 * Handles AWS Lambda events and passes them to processEvent() for processing.
 * @param event - Lambda event object.
 * @param context - Lambda execution context.
 * @returns service response
 */
export const lambdaHandler: Handler = async (
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

/**
 *  Exposes the Lambda handler and sets up middleware functions to run before and after the processEvent() function is called.
 */
export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(MySqlConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
