import { Context } from 'aws-lambda/handler';
import { Mailer } from './mailer';
import { MailEventType } from 'at-lib';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [MailEventType.SEND_MAIL]: Mailer.sendMail,
  };

  return await processors[event.eventName](event, context);
}
