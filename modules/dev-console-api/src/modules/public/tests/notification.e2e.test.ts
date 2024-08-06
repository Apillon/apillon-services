import {
  Stage,
  TestUser,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';
import { NotificationType, SqlModelStatus } from '@apillon/lib';

describe('Notification controller tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testUser2: TestUser;
  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Get notifications', () => {
    test('Authorized user should be able to get his notifications', async () => {
      const createdNotification = {
        type: NotificationType.UNKNOWN,
        userId: testUser.user.id,
      };

      await stage.db.config.paramExecute(
        `INSERT INTO notification (type, createUser) VALUES ('${createdNotification.type}', ${createdNotification.userId})`,
      );

      const response = await request(stage.http)
        .get('/public/notification')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      const responseNotification = response.body.data.items[0];
      expect(responseNotification.id).toBeDefined();
      expect(responseNotification.type).toBe(createdNotification.type);
      expect(responseNotification.isRead).toBe(0);
      expect(responseNotification.status).toBe(SqlModelStatus.ACTIVE);
    });
  });

  test('Authorized user should only get his notifications', async () => {
    const response = await request(stage.http)
      .get('/public/notification')
      .set('Authorization', `Bearer ${testUser2.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(0);
  });

  test('Authorized user should be able to filter notifications', async () => {
    const createdNotification = {
      type: NotificationType.UNKNOWN,
      userId: testUser.user.id,
      isRead: true,
    };

    await stage.db.config.paramExecute(
      `INSERT INTO notification (type, createUser, isRead) VALUES (${createdNotification.type}, ${createdNotification.userId}, 1)`,
    );

    const response = await request(stage.http)
      .get('/public/notification?isRead=1')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    const responseNotification = response.body.data.items[0];
    expect(responseNotification.id).toBeDefined();
    expect(responseNotification.type).toBe(createdNotification.type);
    expect(responseNotification.isRead).toBe(1);
    expect(responseNotification.status).toBe(SqlModelStatus.ACTIVE);

    const responseExpectingNoResults = await request(stage.http)
      .get('/public/notification?status=1')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(responseExpectingNoResults.status).toBe(200);
    expect(responseExpectingNoResults.body.data.items).toHaveLength(0);
  });

  test('Unauthorized user should not be able to get notifications', async () => {
    const response = await request(stage.http).get('/public/notification');
    expect(response.status).toBe(401);
  });
});
