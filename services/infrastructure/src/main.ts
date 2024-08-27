import { Context } from 'aws-lambda/handler';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {};
  return await processors[event.eventName](event, context);
}
