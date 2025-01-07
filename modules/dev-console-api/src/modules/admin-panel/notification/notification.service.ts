import { Injectable, HttpStatus } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import {
  Ams,
  CodeException,
  Mailing,
  NotificationQueryFilter,
} from '@apillon/lib';
import { CreateOrUpdateNotificationDto } from './dtos/create-or-update-notification.dto';
import { ResourceNotFoundErrorCode } from '../../../config/types';

@Injectable()
export class NotificationService {
  async createNotification(
    context: DevConsoleApiContext,
    body: CreateOrUpdateNotificationDto,
  ) {
    if (body.userEmail) {
      const user = await new Ams(context).getAuthUserByEmail(body.userEmail);
      if (!user.data.id) {
        throw new CodeException({
          code: ResourceNotFoundErrorCode.USER_EMAIL_NOT_EXISTS,
          status: HttpStatus.NOT_FOUND,
          errorCodes: ResourceNotFoundErrorCode,
        });
      }
      body.userId = user.data.id;
    }
    return (await new Mailing(context).createNotification(body)).data;
  }

  async updateNotification(
    id: number,
    data: CreateOrUpdateNotificationDto,
    context: DevConsoleApiContext,
  ) {
    if (data.userEmail) {
      const user = await new Ams(context).getAuthUserByEmail(data.userEmail);
      if (!user.data) {
        throw new CodeException({
          code: ResourceNotFoundErrorCode.USER_EMAIL_NOT_EXISTS,
          status: HttpStatus.NOT_FOUND,
          errorCodes: ResourceNotFoundErrorCode,
        });
      }
      data.userId = user.data.id;
    }
    return (await new Mailing(context).updateNotification(id, data)).data;
  }

  async deleteNotification(id: number, context: DevConsoleApiContext) {
    return (await new Mailing(context).deleteNotification(id)).data;
  }

  async getNotifications(
    context: DevConsoleApiContext,
    query: NotificationQueryFilter,
  ) {
    return (await new Mailing(context).getNotifications(query)).data;
  }
}
