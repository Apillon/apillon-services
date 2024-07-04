import {
  Stage,
  TestUser,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';
import { ServiceStatusType } from '../../../config/types';
import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
import { type ResultSetHeader } from 'mysql2';

describe('Service status tests', () => {
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

  describe('Get service statuses', () => {
    test('Authorized user should be able to get service statuses', async () => {
      const createdServiceStatus = {
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
        status: SqlModelStatus.ACTIVE,
      };
      const data = await stage.db.devConsole.paramExecute(`
      INSERT INTO service_status (message, type, status)
      VALUES ('${createdServiceStatus.message}', '${createdServiceStatus.type}', '${createdServiceStatus.status}')`);

      const response = await request(stage.http)
        .get('/service-status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      const responseServiceStatus = response.body.data.items[0];
      expect(responseServiceStatus.id).toBeDefined();
      expect(responseServiceStatus.message).toBe(createdServiceStatus.message);
      expect(responseServiceStatus.type).toBe(createdServiceStatus.type);
      expect(responseServiceStatus.status).toBe(createdServiceStatus.status);
      expect(responseServiceStatus.url).toBeNull();
    });

    test('Unauthorized user should not be able to get service statuses', async () => {
      const response = await request(stage.http).get('/service-status');
      expect(response.status).toBe(401);
    });
  });

  describe('Create service status', () => {
    test('Admin can create new service status', async () => {
      const requestBody = {
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
        status: SqlModelStatus.ACTIVE,
        url: 'https://apillon.io',
      };
      const response = await request(stage.http)
        .post('/service-status')
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(201);
      const responseServiceStatus = response.body.data;
      expect(responseServiceStatus.id).toBeDefined();
      expect(responseServiceStatus.message).toBe(requestBody.message);
      expect(responseServiceStatus.type).toBe(requestBody.type);
      expect(responseServiceStatus.status).toBe(requestBody.status);
      expect(responseServiceStatus.url).toBe(requestBody.url);
      const data = await stage.db.devConsole.paramExecute(`
      SELECT * FROM service_status WHERE id = ${responseServiceStatus.id}`);

      expect(data).toHaveLength(1);
      const fetchedStatus = data[0];
      expect(fetchedStatus.id).toBe(responseServiceStatus.id);
      expect(fetchedStatus.message).toBe(requestBody.message);
      expect(fetchedStatus.type).toBe(requestBody.type);
      expect(fetchedStatus.status).toBe(requestBody.status);
      expect(fetchedStatus.url).toBe(requestBody.url);
      expect(fetchedStatus.createTime).toBeDefined();
      expect(fetchedStatus.updateTime).toBeDefined();
      expect(fetchedStatus.createUser).toBeDefined();
      expect(fetchedStatus.updateUser).toBeDefined();
    });

    test('User cannot create new service status', async () => {
      const requestBody = {
        id: 2,
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
      };
      const response = await request(stage.http)
        .post('/service-status')
        .send(requestBody)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Unauthorized user cannot create new service status', async () => {
      const requestBody = {
        id: 3,
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
      };
      const response = await request(stage.http)
        .post('/service-status')
        .send(requestBody);
      expect(response.status).toBe(401);
    });
  });

  describe('Update service status', () => {
    test('Admin can update service status', async () => {
      const initialServiceStatus = {
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
        status: SqlModelStatus.ACTIVE,
      };
      // ParamExecute returns wrong type when using INSERT query so we need to cast it
      const data = (await stage.db.devConsole.paramExecute(`
      INSERT INTO service_status (message, type, status)
      VALUES ('${initialServiceStatus.message}', '${initialServiceStatus.type}', '${initialServiceStatus.status}')`)) as any as ResultSetHeader;
      const requestBody = {
        message: 'New msg',
        type: ServiceStatusType.INFO,
        status: SqlModelStatus.ARCHIVED,
        url: 'https://apillon.io',
      };

      const response = await request(stage.http)
        .patch(`/service-status/${data.insertId}`)
        .send(requestBody)
        .set('Authorization', `Bearer ${adminTestUser.token}`);

      expect(response.status).toBe(200);
      const responseServiceStatus = response.body.data;
      expect(responseServiceStatus.id).toBeDefined();
      expect(responseServiceStatus.message).toBe(requestBody.message);
      expect(responseServiceStatus.type).toBe(requestBody.type);
      expect(responseServiceStatus.status).toBe(requestBody.status);
      expect(responseServiceStatus.url).toBe(requestBody.url);
    });

    test('User cannot update service status', async () => {
      const requestBody = {
        message: 'New msg',
        type: ServiceStatusType.INFO,
        status: SqlModelStatus.ARCHIVED,
        url: 'https://apillon.io',
      };

      const response = await request(stage.http)
        .patch('/service-status/1')
        .send(requestBody)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(403);
    });

    test('Unauthorized user cannot update service status', async () => {
      const requestBody = {
        message: 'New msg',
        type: ServiceStatusType.INFO,
        status: SqlModelStatus.ARCHIVED,
        url: 'https://apillon.io',
      };

      const response = await request(stage.http)
        .patch('/service-status/1')
        .send(requestBody);

      expect(response.status).toBe(401);
    });
  });
});
