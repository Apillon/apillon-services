import {
  ErrorHandler,
  InitializeContextAndFillUser,
  ResponseFormat,
  logLambdaEvent,
} from '@apillon/service-lib';
import * as middy from '@middy/core';
import type { Callback, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

/**
 * Handles AWS Lambda events and passes them to processEvent() for processing.
 * @param event - Lambda event object.
 * @param context - Lambda execution context.
 * @returns service response
 */
const lambdaHandler: Handler = async (
  event: any,
  context: any,
  _callback: Callback,
) => {
  logLambdaEvent(event);

  return await processEvent(event, context.serviceContext);
};

/**
 *  Exposes the Lambda handler and sets up middleware functions to run before and after the processEvent() function is called.
 */
export const handler = middy.default(lambdaHandler);
handler
  .use(InitializeContextAndFillUser())
  .use(ResponseFormat())
  .use(ErrorHandler());
