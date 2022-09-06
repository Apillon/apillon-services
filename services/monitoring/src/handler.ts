import { Callback, Context, Handler } from 'aws-lambda/handler';
import { Logger } from './logger';
import { LmasEventType } from 'at-sdk';
import { Alerting } from './alerting';

export const handler: Handler = async (
  event: any,
  context: Context,
  _callback: Callback,
) => {
  console.log(event);

  return await processEvent(event, context);
};

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [LmasEventType.WRITE_LOG]: Logger.writeLog,
    [LmasEventType.SEND_ALERT]: Alerting.sendAlert,
  };

  return await processors[event.eventName](event, context);
}
