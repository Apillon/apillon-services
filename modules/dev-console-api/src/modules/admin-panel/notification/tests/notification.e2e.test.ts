import {
  Stage,
  TestUser,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import * as request from 'supertest';
import { ServiceStatusType } from '../../../../config/types';
import {
  DefaultUserRole,
  NotificationType,
  SqlModelStatus,
} from '@apillon/lib';

describe('Notification tests', () => {
  let stage: Stage;
  let testUser: TestUser;

  let adminTestUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );
  });

  afterEach(async () => {
    await stage.db.config.paramExecute('DELETE FROM notification');
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Create notification', () => {
    test('Admin can create a user notification using user id', async () => {
      const requestBody = {
        type: NotificationType.UNKNOWN,
        userId: testUser.user.id,
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(201);
      const responseNotification = response.body.data;
      expect(responseNotification.id).toBeDefined();
      expect(responseNotification.type).toBe(requestBody.type);
      expect(responseNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(responseNotification.userId).toBe(requestBody.userId);
      expect(responseNotification.message).toBeNull();

      const data = await stage.db.config.paramExecute(`
        SELECT * FROM notification`);

      expect(data).toHaveLength(1);
      expect(data[0].userId).toBe(testUser.user.id);
    });

    test('Admin can create a user notification using user email', async () => {
      const requestBody = {
        type: NotificationType.UNKNOWN,
        userEmail: testUser.user.email,
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(201);
      const responseNotification = response.body.data;
      expect(responseNotification.id).toBeDefined();
      expect(responseNotification.type).toBe(requestBody.type);
      expect(responseNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(responseNotification.userId).toBe(testUser.user.id);
      expect(responseNotification.message).toBeNull();

      const data = await stage.db.config.paramExecute(`
        SELECT * FROM notification`);

      expect(data).toHaveLength(1);
      expect(data[0].userId).toBe(testUser.user.id);
    });

    test('Admin can create new global notification', async () => {
      const requestBody = {
        type: NotificationType.UNKNOWN,
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(201);
      const responseNotification = response.body.data;
      expect(responseNotification.id).toBeDefined();
      expect(responseNotification.type).toBe(requestBody.type);
      expect(responseNotification.status).toBe(SqlModelStatus.ACTIVE);
      expect(responseNotification.userId).toBeNull();
      expect(responseNotification.message).toBeNull();

      const data = await stage.db.config.paramExecute(`
        SELECT * FROM notification`);

      expect(data).toHaveLength(1);
    });

    test('Admin cannot create a notification with unknown user email', async () => {
      const requestBody = {
        type: NotificationType.UNKNOWN,
        userEmail: 'invalid_email@apillon.io',
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(404);
    });

    test('Admin cannot create a user notification without type & message', async () => {
      const requestBody = {
        userId: testUser.user.id,
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(500);
    });

    test('User cannot create global notifications', async () => {
      const requestBody = {
        id: 2,
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Unauthorized user cannot create global notifications', async () => {
      const requestBody = {
        id: 3,
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
      };
      const response = await request(stage.http)
        .post('/notification')
        .send(requestBody);
      expect(response.status).toBe(401);
    });
  });

  describe('Update notification', () => {
    test('Admin can update a global notification', async () => {
      await stage.db.config.paramExecute(`
      INSERT INTO notification(message) VALUES ('Initial message')`);

      const lastInsertId = await stage.db.config.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const notificationId = lastInsertId[0].id;

      const requestBody = {
        message: 'Service unavailable',
      };

      const response = await request(stage.http)
        .patch(`/notification/${notificationId}`)
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(200);
      const responseNotification = response.body.data;
      expect(responseNotification.id).toBe(notificationId);
      expect(responseNotification.message).toBe(requestBody.message);
    });

    test("Admin can update user's notification", async () => {
      await stage.db.config.paramExecute(`
      INSERT INTO notification(message, userId) VALUES ('Initial message', ${testUser.user.id})`);

      const lastInsertId = await stage.db.config.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const notificationId = lastInsertId[0].id;

      const requestBody = {
        message: 'Service unavailable',
        userId: testUser.user.id,
      };

      const response = await request(stage.http)
        .patch(`/notification/${notificationId}`)
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(200);
      const responseNotification = response.body.data;
      expect(responseNotification.id).toBe(notificationId);
      expect(responseNotification.userId).toBe(requestBody.userId);
      expect(responseNotification.message).toBe(requestBody.message);
    });

    test('User cannot update notifications', async () => {
      await stage.db.config.paramExecute(`
      INSERT INTO notification(message) VALUES ('Initial message')`);

      const lastInsertId = await stage.db.config.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const notificationId = lastInsertId[0].id;

      const requestBody = {
        message: 'Service unavailable',
      };

      const response = await request(stage.http)
        .patch(`/notification/${notificationId}`)
        .send(requestBody)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Delete notification', () => {
    test('Admin can delete a notification', async () => {
      await stage.db.config.paramExecute(`
      INSERT INTO notification(message) VALUES ('Initial message')`);

      const lastInsertId = await stage.db.config.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const notificationId = lastInsertId[0].id;

      const response = await request(stage.http)
        .delete(`/notification/${notificationId}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(200);
      const responseNotification = response.body.data;
      expect(responseNotification.id).toBe(notificationId);
      expect(responseNotification.status).toBe(SqlModelStatus.DELETED);
      expect(responseNotification.message).toBe('Initial message');

      const data = await stage.db.config.paramExecute(`
        SELECT * FROM notification`);

      expect(data).toHaveLength(1);
      expect(data[0].status).toBe(SqlModelStatus.DELETED);
    });
  });
});
