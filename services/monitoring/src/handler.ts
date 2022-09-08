import { Callback, Context, Handler } from 'aws-lambda/handler';
import { processEvent } from './main';

export const handler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};
