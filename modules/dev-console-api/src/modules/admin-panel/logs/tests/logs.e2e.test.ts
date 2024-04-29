import {
  ApiName,
  DefaultUserRole,
  LogType,
  MongoCollections,
  RequestLogDto,
  ServiceName,
  env,
} from '@apillon/lib';
import * as request from 'supertest';
import { TestUser, createTestUser } from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../../test/helpers/setup';
import { v4 as uuid } from 'uuid';

describe('Admin Logs', () => {
  let stage: Stage;
  let testUser: TestUser;
  let adminTestUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );

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
    let apiKey: string;
    let insertedIds: any[];
    beforeAll(async () => {
      project_uuid = uuid();
      user_uuid = uuid();
      apiKey = uuid();
      const records = await Promise.all([
        stage.lmasContext.mongo.db.collection(MongoCollections.LOGS).insertOne({
          project_uuid,
          user_uuid,
          logType: LogType.INFO,
          service: ServiceName.BLOCKCHAIN,
          ts: new Date('2060-01-01'),
        }),
        stage.lmasContext.mongo.db.collection(MongoCollections.LOGS).insertOne({
          project_uuid: uuid(),
          user_uuid,
          logType: LogType.ERROR,
          service: ServiceName.STORAGE,
          ts: new Date('2060-02-02'),
        }),
        stage.lmasContext.mongo.db.collection(MongoCollections.LOGS).insertOne({
          project_uuid,
          user_uuid: uuid(),
          logType: LogType.INFO,
          service: ServiceName.BLOCKCHAIN,
          ts: new Date('2060-03-03'),
          message: 'e2e test',
        }),
        stage.lmasContext.mongo.db
          .collection(MongoCollections.ADMIN_ALERT)
          .insertOne({
            logType: LogType.INFO,
            service: ServiceName.BLOCKCHAIN,
            ts: new Date('2060-03-03'),
            message: 'Admin e2e Alert 1',
          }),
        stage.lmasContext.mongo.db
          .collection(MongoCollections.ADMIN_ALERT)
          .insertOne({
            logType: LogType.ALERT,
            service: ServiceName.STORAGE,
            ts: new Date('2060-03-03'),
            message: 'Admin e2e Alert 2',
          }),
        stage.lmasContext.mongo.db
          .collection(MongoCollections.REQUEST_LOGS)
          .insertOne(
            new RequestLogDto({
              apiName: ApiName.DEV_CONSOLE_API,
              status: 200,
              method: 'GET',
              user_uuid,
              ts: new Date('2060-03-03'),
            }),
          ),
        stage.lmasContext.mongo.db
          .collection(MongoCollections.API_REQUEST_LOGS)
          .insertOne(
            new RequestLogDto({
              apiName: ApiName.APILLON_API,
              status: 200,
              method: 'GET',
              apiKey,
              ts: new Date('2060-03-03'),
            }),
          ),
      ]);
      insertedIds = records.map((r) => r.insertedId);
    });

    afterAll(async () => {
      // Delete inserted records
      for (const objectId of insertedIds) {
        for (const collection of Object.values(MongoCollections)) {
          await stage.lmasContext.mongo.db
            .collection(collection)
            .deleteOne({ _id: objectId });
        }
      }
    });

    test('Logs query filtering should properly filter results', async () => {
      let response = await request(stage.http)
        .get(`/admin-panel/logs?limit=3`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(3);
      ['logType', 'service', 'ts', '_id'].forEach((prop) =>
        expect(response.body.data.items[0]).toHaveProperty(prop),
      );

      response = await request(stage.http)
        .get(`/admin-panel/logs?logTypes=INFO`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.every((log) => log.logType === LogType.INFO),
      ).toBe(true);

      response = await request(stage.http)
        .get(`/admin-panel/logs?services=STORAGE`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.every((log) => log.service === ServiceName.STORAGE),
      ).toBe(true);

      response = await request(stage.http)
        .get(`/admin-panel/logs?user_uuid=${user_uuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(
        response.body.data.items.every((log) => log.user_uuid === user_uuid),
      ).toBe(true);

      response = await request(stage.http)
        .get(`/admin-panel/logs?project_uuid=${project_uuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(
        response.body.data.items.every(
          (log) => log.project_uuid === project_uuid,
        ),
      ).toBe(true);

      response = await request(stage.http)
        .get(`/admin-panel/logs?dateFrom=2060-02-01`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);

      response = await request(stage.http)
        .get(`/admin-panel/logs?dateFrom=2060-01-01&dateTo=2060-02-02`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);

      response = await request(stage.http)
        .get(`/admin-panel/logs?search=e2e`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].message).toEqual('e2e test');
    });

    test('Admin Alert filtering should properly filter results', async () => {
      let response = await request(stage.http)
        .get(
          `/admin-panel/logs/admin-alerts?logTypes=ALERT&dateFrom=2060-01-01`,
        )
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].message).toEqual('Admin Alert 2');
      expect(response.body.data.items[0].service).toEqual(ServiceName.STORAGE);
      expect(response.body.data.items[0].logType).toEqual(LogType.ALERT);

      response = await request(stage.http)
        .get(
          `/admin-panel/logs/admin-alerts?services=BLOCKCHAIN&services=STORAGE&dateFrom=2060-01-01`,
        )
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);

      response = await request(stage.http)
        .get(`/admin-panel/logs/admin-alerts?search=1&dateFrom=2060-01-01`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    test('Request Logs filtering should properly filter results', async () => {
      let response = await request(stage.http)
        .get(
          `/admin-panel/logs/request-logs?user_uuid=${user_uuid}&dateFrom=2060-01-01`,
        )
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].apiName).toEqual(
        ApiName.DEV_CONSOLE_API,
      );
      expect(response.body.data.items[0].status).toEqual(200);

      response = await request(stage.http)
        .get(
          `/admin-panel/logs/request-logs?collectionName=${MongoCollections.API_REQUEST_LOGS}&apiKey=${apiKey}&dateFrom=2060-01-01`,
        )
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].apiName).toEqual(ApiName.APILLON_API);
      expect(response.body.data.items[0].status).toEqual(200);
    });
  });
});
