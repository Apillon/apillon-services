import type { Context } from 'aws-lambda/handler';
import { Mailer } from './mailer';
import { MailEventType } from '@apillon/lib';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [MailEventType.SEND_MAIL]: Mailer.sendDefaultMail,
    [MailEventType.SEND_CUSTOM_MAIL]: Mailer.sendCustomMail,
  };

  return await processors[event.eventName](event, context);
}
