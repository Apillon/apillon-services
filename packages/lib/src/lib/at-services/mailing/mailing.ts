import { env } from '../../../config/env';
import { AppEnvironment, MailEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateOrUpdateNotificationDto } from './dto/create-or-update-notification.dto';
import { EmailDataDto } from './dto/email-data.dto';
import { NotificationQueryFilter } from './dto/notification-query-filter.dto';

/**
 * Access Management Service client
 */
export class Mailing extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.MAIL_FUNCTION_NAME_TEST
      : env.MAIL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.MAIL_SOCKET_PORT_TEST
      : env.MAIL_SOCKET_PORT;
  serviceName = 'MAIL';

  constructor(context?: Context) {
    super(context);
    this.isDefaultAsync = true;
  }

  private async callSyncService(payload: any) {
    return await this.callService(payload, { isAsync: false });
  }

  public async sendMail(emailData: EmailDataDto) {
    const data = {
      eventName: MailEventType.SEND_MAIL,
      emailData: emailData.serialize(),
    };

    const mailResponse = await this.callService(data);

    return {
      ...mailResponse,
    };
  }

  public async sendCustomMail(emailData: EmailDataDto) {
    const data = {
      eventName: MailEventType.SEND_CUSTOM_MAIL,
      emailData: emailData.serialize(),
    };

    const mailResponse = await this.callService(data);

    return {
      ...mailResponse,
    };
  }

  public async setMailerliteField(
    field: string,
    value: any = true,
    email: string = null,
  ) {
    try {
      return await this.callService({
        eventName: MailEventType.SET_MAILERLITE_FIELD,
        field,
        value,
        email,
      });
    } catch (err) {
      console.error(`Error setting mailerlite field ${field}: ${err}`);
    }
  }

  //#region notifications
  public async getNotificationListForUser(query: NotificationQueryFilter) {
    return this.callSyncService({
      eventName: MailEventType.GET_NOTIFICATIONS_FOR_USER,
      query,
    });
  }

  public async getNotifications(query: NotificationQueryFilter) {
    return this.callSyncService({
      eventName: MailEventType.GET_NOTIFICATIONS,
      query,
    });
  }

  public async createNotification(data: CreateOrUpdateNotificationDto) {
    return await this.callSyncService({
      eventName: MailEventType.CREATE_NOTIFICATION,
      data,
    });
  }

  public async updateNotification(
    id: number,
    data: CreateOrUpdateNotificationDto,
  ) {
    return await this.callSyncService({
      eventName: MailEventType.UPDATE_NOTIFICATION,
      data: { id, data },
    });
  }
  public async deleteNotification(id: number) {
    return await this.callSyncService({
      eventName: MailEventType.DELETE_NOTIFICATION,
      id,
    });
  }

  //#endregion
}
