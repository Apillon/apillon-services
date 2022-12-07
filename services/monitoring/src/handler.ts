import * as middy from '@middy/core';
import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';
import { ErrorHandler } from './middleware/error';
import { MongoDbConnect } from './middleware/mongoDb';
import { ResponseFormat } from './middleware/response';

const lambdaHandler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  //TODO: handle security token and remove it form event.

  // remove security token
  delete event.securityToken;
  console.log(event);

  return await processEvent(event, context);
};

export const handler = middy.default(lambdaHandler);
handler //
  .use(MongoDbConnect())
  .use(ResponseFormat())
  .use(ErrorHandler());
