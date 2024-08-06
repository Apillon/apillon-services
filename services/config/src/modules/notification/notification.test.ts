import {
  NotificationQueryFilter,
  NotificationType,
  SqlModelStatus,
} from '@apillon/lib';
import { Stage, setupTest, releaseStage } from '../../../test/setup';
import { NotificationService } from './notification.service';

describe('Notification unit tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
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
        `INSERT INTO notification (type, createUser) VALUES ('${notificationToCreate.type}', ${stage.context.user.id})`,
      );
      const result = await NotificationService.getNotificationList(
        new NotificationQueryFilter(),
        stage.context,
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const returnedNotification = result.items[0];
      expect(returnedNotification.id).toBeDefined();
      expect(returnedNotification.type).toBe(notificationToCreate.type);
      expect(returnedNotification.isRead).toBe(0);
      expect(returnedNotification.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('Notification filtering', async () => {
      const result = await NotificationService.getNotificationList(
        new NotificationQueryFilter({ type: NotificationType.UNKNOWN }),
        stage.context,
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const returnedNotification = result.items[0];
      expect(returnedNotification.id).toBeDefined();
      expect(returnedNotification.type).toBe(NotificationType.UNKNOWN);
      expect(returnedNotification.isRead).toBe(0);
      expect(returnedNotification.status).toBe(SqlModelStatus.ACTIVE);

      const readNotifications = await NotificationService.getNotificationList(
        new NotificationQueryFilter({ isRead: true }),
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
      };

      const result = await NotificationService.createNotification(
        notificationToCreate,
        stage.context,
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(notificationToCreate.type);
      expect(result.isRead).toBe(0);
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
      expect(dbNotification.isRead).toBe(0);
      expect(dbNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(dbNotification.createUser).toBe(stage.context.user.id);
      expect(dbNotification.createDate).toBeDefined();
      expect(dbNotification.updateDate).toBeDefined();
    });
  });

  describe('Update notification', () => {
    test('Successfully update notification', async () => {
      const notificationToUpdate = {
        isRead: true,
      };
      const createdData = await stage.db.paramExecute(
        `INSERT INTO notification (type, createUser) VALUES ('${NotificationType.UNKNOWN}', ${stage.context.user.id}) RETURNING id`,
      );

      const notificationId = createdData[0].id;

      const result = await NotificationService.updateNotification(
        { id: notificationId, data: notificationToUpdate },
        stage.context,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(notificationId);
      expect(result.type).toBe(NotificationType.UNKNOWN);
      expect(result.isRead).toBe(1);
      expect(result.status).toBe(SqlModelStatus.ACTIVE);

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
      expect(dbNotification.isRead).toBe(1);
      expect(dbNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(dbNotification.createUser).toBe(stage.context.user.id);
      expect(dbNotification.createDate).toBeDefined();
      expect(dbNotification.updateDate).toBeDefined();
    });
  });
});
