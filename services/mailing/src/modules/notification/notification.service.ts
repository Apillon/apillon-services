import {
  CodeException,
  ModelValidationException,
  NotificationQueryFilter,
  ValidatorErrorCode,
  CreateOrUpdateNotificationDto,
  HttpStatus,
  NotificationAdminQueryFilter,
} from '@apillon/lib';
import { Notification } from './models/notification.model';
import { ServiceContext } from '@apillon/service-lib';
import { MailErrorCode } from '../../config/types';
export class NotificationService {
  static async getNotificationList(
    data: { query: NotificationAdminQueryFilter },
    context: ServiceContext,
  ) {
    return await new Notification({}, context).getList(
      new NotificationAdminQueryFilter(data.query, context),
    );
  }

  static async getNotificationListForUser(
    data: { query: NotificationQueryFilter },
    context: ServiceContext,
  ) {
    return await new Notification({}, context).getListForUser(
      new NotificationQueryFilter(data.query, context),
    );
  }

  static async createNotification(
    { data }: { data: CreateOrUpdateNotificationDto },
    context: ServiceContext,
  ) {
    const notification = new Notification({}, context).populate(data);
    await notification.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    const createdNotification = await notification.insert();
    return createdNotification.serialize();
  }

  static async updateNotification(
    {
      data: { data, id },
    }: { data: { id: number; data: CreateOrUpdateNotificationDto } },
    context: ServiceContext,
  ) {
    const notification = await new Notification({}, context).populateById(id);
    if (!notification.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: MailErrorCode.NOTIFICATION_NOT_FOUND,
      });
    }
    notification.populate(data);
    await notification.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    await notification.update();
    return notification.serialize();
  }

  static async deleteNotification(
    { id }: { id: number },
    context: ServiceContext,
  ) {
    const notification = await new Notification({}, context).populateById(id);
    if (!notification.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: MailErrorCode.NOTIFICATION_NOT_FOUND,
      });
    }
    await notification.markDeleted();
    return notification.serialize();
  }
}
