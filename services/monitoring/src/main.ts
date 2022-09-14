import { Logger } from './logger';
import { LmasEventType } from 'at-lib';
import { Alerting } from './alerting';
import { Context } from 'aws-lambda/handler';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [LmasEventType.WRITE_LOG]: Logger.writeLog,
    [LmasEventType.SEND_ALERT]: Alerting.sendAlert,
  };

  return await processors[event.eventName](event, context);
}
