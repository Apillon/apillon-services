import { Logger } from './logger';
import { LmasEventType } from '@apillon/lib';
import { Alerting } from './alerting';
import { Context } from 'aws-lambda/handler';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [LmasEventType.WRITE_LOG]: Logger.writeLog,
    [LmasEventType.WRITE_REQUEST_LOG]: Logger.writeRequestLog,
    [LmasEventType.SEND_ALERT]: Alerting.sendAlert,
    [LmasEventType.SEND_ADMIN_ALERT]: Alerting.sendAdminAlert,
  };

  return await processors[event.eventName](event, context);
}
