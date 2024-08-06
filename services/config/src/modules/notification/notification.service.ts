import {
  CodeException,
  ModelValidationException,
  NotificationQueryFilter,
  ValidatorErrorCode,
} from '@apillon/lib';
import { Notification } from './models/notification.model';
import { ServiceContext } from '@apillon/service-lib';
import { HttpStatus } from '@nestjs/common';
import { ConfigErrorCode } from '../../config/types';

export class NotificationService {
  static async getNotificationList(
    query: NotificationQueryFilter,
    context: ServiceContext,
  ) {
    return await new Notification({}, context).getListForUser(query);
  }

  static async createNotification(data: any, context: ServiceContext) {
    const notification = new Notification(data, context);
    await notification.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    const createdNotification = await notification.insert();
    return createdNotification.serialize();
  }

  static async updateNotification(
    { notificationId, data }: any,
    context: ServiceContext,
  ) {
    const notification = await new Notification(
      {},
      context,
    ).populateByIdForUser(notificationId);

    if (!notification.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ConfigErrorCode.NOTIFICATION_NOT_FOUND,
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
}
