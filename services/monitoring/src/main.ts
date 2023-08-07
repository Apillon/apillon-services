import { Logger } from './logger';
import { LmasEventType } from '@apillon/lib';
import { Alerting } from './alerting';
import type { Context } from 'aws-lambda/handler';

/**
 * Processes an event using one of the provided processors based on the event's name.
 * @param event Lambda event message
 * @param context Lambda context
 * @returns service response
 */
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [LmasEventType.WRITE_LOG]: Logger.writeLog,
    [LmasEventType.WRITE_REQUEST_LOG]: Logger.writeRequestLog,
    [LmasEventType.LIST_LOGS]: Logger.listLogs,
    [LmasEventType.GET_API_KEYS_USAGE_COUNT]: Logger.getApiKeysUsageCount,
    [LmasEventType.SEND_ALERT]: Alerting.sendAlert,
    [LmasEventType.SEND_ADMIN_ALERT]: Alerting.sendAdminAlert,
  };

  return await processors[event.eventName](event, context);
}
