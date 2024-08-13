import {
  AppEnvironment,
  CodeException,
  ModelValidationException,
  MySql,
  NotificationQueryFilter,
  ValidatorErrorCode,
  env,
} from '@apillon/lib';
import { Notification } from './models/notification.model';
import { ServiceContext } from '@apillon/service-lib';
import { HttpStatus } from '@nestjs/common';
import { ConfigErrorCode } from '../../config/types';
import { CreateNotificationDto, UpdateNotificationDto } from '@apillon/lib';
import { AuthUser } from '@apillon/access/src/modules/auth-user/auth-user.model';

export class NotificationService {
  static async getNotificationList(
    data: { query: NotificationQueryFilter },
    context: ServiceContext,
  ) {
    return await new Notification({}, context).getListForUser(
      new NotificationQueryFilter(data.query, context),
    );
  }

  static async createGlobalNotification(
    data: CreateNotificationDto,
    context: ServiceContext,
  ) {
    const accessContext = new ServiceContext();
    const mysql = new MySql({
      host:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_HOST_TEST
          : env.ACCESS_MYSQL_HOST,
      port:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_PORT_TEST
          : env.ACCESS_MYSQL_PORT,
      database:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_DATABASE_TEST
          : env.ACCESS_MYSQL_DATABASE,
      user:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_USER_TEST
          : env.ACCESS_MYSQL_USER,
      password:
        env.APP_ENV === AppEnvironment.TEST
          ? env.ACCESS_MYSQL_PASSWORD_TEST
          : env.ACCESS_MYSQL_PASSWORD,
    });
    await mysql.connect();
    accessContext.setMySql(mysql);

    const users = await new AuthUser({}, accessContext).getActiveUsers();
    await Promise.all(
      users.map(async (user) => {
        const notification = new Notification(
          {
            ...data,
            userId: user.id,
            isPublic: true,
          },
          context,
        );
        await notification.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        await notification.create(false);
      }),
    );
    return true;
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
    const createdNotification = await notification.create();
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

  static async readAllNotifications(context: ServiceContext) {
    return await new Notification({}, context).readAllForUser();
  }
}
