import type { Context } from 'aws-lambda/handler';
import { Mailer } from './mailer';
import { MailEventType } from '@apillon/lib';
import { NotificationService } from './modules/notification/notification.service';

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
    [MailEventType.CREATE_NOTIFICATION]: NotificationService.createNotification,
    [MailEventType.UPDATE_NOTIFICATION]: NotificationService.updateNotification,
    [MailEventType.DELETE_NOTIFICATION]: NotificationService.deleteNotification,
    [MailEventType.GET_NOTIFICATIONS]: NotificationService.getNotificationList,
  };

  return await processors[event.eventName](event, context);
}
