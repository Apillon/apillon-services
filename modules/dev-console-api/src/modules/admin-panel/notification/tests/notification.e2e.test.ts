import {
  Stage,
  TestUser,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import * as request from 'supertest';
import { ServiceStatusType } from '../../../../config/types';
import { DefaultUserRole, NotificationType } from '@apillon/lib';

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

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Create service status', () => {
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
      expect(responseNotification).toBe(true);

      const data = await stage.db.devConsole.paramExecute(`
        SELECT * FROM notification`);

      expect(data).toHaveLength(2);
      expect(data.find((n) => n.userId === testUser.user.id)).toBeDefined();
      expect(
        data.find((n) => n.userId === adminTestUser.user.id),
      ).toBeDefined();
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
});
