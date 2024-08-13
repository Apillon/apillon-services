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
import { CreateNotificationDto, UpdateNotificationDto } from '@apillon/lib';

export class NotificationService {
  static async getNotificationList(
    data: { query: NotificationQueryFilter },
    context: ServiceContext,
  ) {
    return await new Notification({}, context).getListForUser(
      new NotificationQueryFilter(data.query, context),
    );
  }

  static async createNotification(
    data: CreateNotificationDto,
    context: ServiceContext,
  ) {
    const notification = new Notification(data, context);
    await notification.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    const createdNotification = await notification.insert();
    return createdNotification.serialize();
  }

  static async updateNotification(
    { id, data }: { id: number; data: UpdateNotificationDto },
    context: ServiceContext,
  ) {
    const notification = await new Notification(
      {},
      context,
    ).populateByIdForUser(id);

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
