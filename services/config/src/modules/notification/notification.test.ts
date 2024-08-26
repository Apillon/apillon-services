import {
  CreateOrUpdateNotificationDto,
  NotificationQueryFilter,
  NotificationType,
  SqlModelStatus,
} from '@apillon/lib';
import { Stage, setupTest, releaseStage } from '../../../test/setup';
import { NotificationService } from './notification.service';
import { ServiceContext } from '@apillon/service-lib';
import { Notification } from './models/notification.model';

describe('Notification unit tests', () => {
  let stage: Stage;
  let context: ServiceContext;
  const userId = 1;
  beforeAll(async () => {
    stage = await setupTest();
    context = stage.context;
    context.user = {
      id: userId,
    };
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('getNotificationList', () => {
    test('Get notifications by user', async () => {
      const notificationToCreate = {
        type: NotificationType.UNKNOWN,
      };

      await stage.db.paramExecute(
        `INSERT INTO notification (type, userId) VALUES ('${notificationToCreate.type}', ${userId})`,
      );

      const result = await NotificationService.getNotificationList(
        { query: new NotificationQueryFilter() },
        context,
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const returnedNotification = result.items[0];
      expect(returnedNotification.id).toBeDefined();
      expect(returnedNotification.type).toBe(notificationToCreate.type);
      expect(returnedNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(returnedNotification.userId).toBe(userId);
      expect(returnedNotification.createTime).toBeDefined();
    });

    test('Notification filtering', async () => {
      const result = await NotificationService.getNotificationList(
        {
          query: new NotificationQueryFilter({
            type: NotificationType.UNKNOWN,
          }),
        },
        stage.context,
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const returnedNotification = result.items[0];
      expect(returnedNotification.id).toBeDefined();
      expect(returnedNotification.type).toBe(NotificationType.UNKNOWN);
      expect(returnedNotification.status).toBe(SqlModelStatus.ACTIVE);

      const readNotifications = await NotificationService.getNotificationList(
        { query: new NotificationQueryFilter({ type: 4 }) },
        stage.context,
      );

      expect(readNotifications.items).toHaveLength(0);
      expect(readNotifications.total).toBe(0);
    });
  });

  describe('createNotification', () => {
    test('Successfully create notification', async () => {
      const notificationToCreate = {
        type: NotificationType.UNKNOWN,
        userId: userId,
      };

      const result = await NotificationService.createNotification(
        { data: new CreateOrUpdateNotificationDto(notificationToCreate) },
        context,
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(notificationToCreate.type);
      expect(result.userId).toBe(notificationToCreate.userId);
      expect(result.status).toBe(SqlModelStatus.ACTIVE);

      const notificationInDB = await stage.db.paramExecute(
        `
        SELECT * FROM notification WHERE id = @id
      `,
        { id: result.id },
      );

      expect(notificationInDB).toHaveLength(1);
      const dbNotification = notificationInDB[0];
      expect(dbNotification.id).toBe(result.id);
      expect(dbNotification.type).toBe(notificationToCreate.type);
      expect(dbNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(dbNotification.userId).toBe(stage.context.user.id);
      expect(dbNotification.createTime).toBeDefined();
      expect(dbNotification.updateTime).toBeDefined();
    });
  });

  describe('Update notification', () => {
    test('Successfully update notification', async () => {
      const notificationToUpdate = {
        message: 'Test message',
        userId: stage.context.user.id,
      };

      await stage.db.paramExecute(
        `INSERT INTO notification (type, userId) VALUES ('${NotificationType.UNKNOWN}', ${stage.context.user.id})`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const notificationId = lastInsertId[0].id;

      const result = await NotificationService.updateNotification(
        {
          data: {
            id: notificationId,
            data: new CreateOrUpdateNotificationDto(notificationToUpdate),
          },
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(notificationId);
      expect(result.type).toBe(NotificationType.UNKNOWN);
      expect(result.status).toBe(SqlModelStatus.ACTIVE);
      expect(result.message).toBe(notificationToUpdate.message);
      expect(result.userId).toBe(stage.context.user.id);

      const notificationInDB = await stage.db.paramExecute(
        `
        SELECT * FROM notification WHERE id = @id
      `,
        { id: notificationId },
      );

      expect(notificationInDB).toHaveLength(1);
      const dbNotification = notificationInDB[0];
      expect(dbNotification.id).toBe(notificationId);
      expect(dbNotification.type).toBe(NotificationType.UNKNOWN);
      expect(dbNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(dbNotification.message).toBe(notificationToUpdate.message);
      expect(dbNotification.userId).toBe(stage.context.user.id);
      expect(dbNotification.createTime).toBeDefined();
      expect(dbNotification.updateTime).toBeDefined();
    });
  });

  describe('deleteNotification', () => {
    test('Successfully delete notification', async () => {
      const notificationToCreate = {
        type: NotificationType.UNKNOWN,
      };
      await stage.db.paramExecute(
        `INSERT INTO notification (type, userId) VALUES ('${notificationToCreate.type}', ${userId})`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const notificationId = lastInsertId[0].id;

      await NotificationService.deleteNotification(
        { id: notificationId },
        context,
      );

      const notificationInDB = (
        await stage.db.paramExecute(
          `
        SELECT * FROM notification WHERE id = @id
      `,
          { id: notificationId },
        )
      )[0] as Notification;

      expect(notificationInDB.id).toBe(notificationId);
      expect(notificationInDB.type).toBe(NotificationType.UNKNOWN);
      expect(notificationInDB.status).toBe(SqlModelStatus.DELETED);
    });
  });
});
