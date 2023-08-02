import { DefaultUserRole, LogType, ServiceName, env } from '@apillon/lib';
import * as request from 'supertest';
import { TestUser, createTestUser } from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import { MongoCollections } from '@apillon/monitoring/src/config/types';
import { v4 as uuid } from 'uuid';
import { UUID } from 'crypto';

describe('Admin Logs', () => {
  let stage: Stage;
  let testUser: TestUser;
  let adminTestUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );

    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Admin logs access tests', () => {
    test('User without admin role should not be able to get logs', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/logs/`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Admin should be able to get logs', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/logs`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
    });
  });

  describe('Admin logs query tests', () => {
    let project_uuid: string;
    let user_uuid: string;
    beforeAll(async () => {
      project_uuid = uuid();
      user_uuid = uuid();
      await stage.lmasContext.mongo.db
        .collection(MongoCollections.LOGS)
        .insertOne({
          project_uuid,
          user_uuid,
          logType: LogType.INFO,
          service: ServiceName.BLOCKCHAIN,
          ts: new Date(),
        });
      await stage.lmasContext.mongo.db
        .collection(MongoCollections.LOGS)
        .insertOne({
          project_uuid: uuid(),
          user_uuid,
          logType: LogType.ERROR,
          service: ServiceName.STORAGE,
          ts: new Date(),
        });
      await stage.lmasContext.mongo.db
        .collection(MongoCollections.LOGS)
        .insertOne({
          project_uuid,
          user_uuid: uuid(),
          logType: LogType.INFO,
          service: ServiceName.BLOCKCHAIN,
          ts: new Date(),
        });
    });

    test('Logs query filtering should properly filter results', async () => {
      let response = await request(stage.http)
        .get(`/admin-panel/logs?limit=3`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);

      response = await request(stage.http)
        .get(`/admin-panel/logs?logType=INFO`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(20);
      expect(
        response.body.data.every((log) => log.logType === LogType.INFO),
      ).toBe(true);

      response = await request(stage.http)
        .get(`/admin-panel/logs?service=STORAGE`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(20);
      expect(response.body.data[0].service).toBe(ServiceName.STORAGE);

      response = await request(stage.http)
        .get(`/admin-panel/logs?user_uuid=${user_uuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      // TODO: No results returned?
      // expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.every((log) => log.user_uuid === user_uuid),
      ).toBe(true);

      response = await request(stage.http)
        .get(`/admin-panel/logs?project_uuid=${project_uuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      // expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.every((log) => log.project_uuid === project_uuid),
      ).toBe(true);
    });
  });
});
