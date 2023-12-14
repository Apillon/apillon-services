import type { Context } from 'aws-lambda/handler';
import { Mailer } from './mailer';
import { MailEventType } from '@apillon/lib';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [MailEventType.SEND_MAIL]: Mailer.sendDefaultMail,
    [MailEventType.SEND_CUSTOM_MAIL]: Mailer.sendCustomMail,
    [MailEventType.SET_MAILERLITE_FIELD]: Mailer.setMailerliteField,
  };

  return await processors[event.eventName](event, context);
}
