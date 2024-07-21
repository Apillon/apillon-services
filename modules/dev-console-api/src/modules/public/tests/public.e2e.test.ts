import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, EvmChain, SqlModelStatus } from '@apillon/lib';
import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { ServiceStatusType } from '../../../config/types';

describe('Public controller tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    const user2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    await createTestUser(stage.context.devConsole, stage.context.access);

    await createTestProject(testUser, stage);
    await createTestProject(user2, stage);

    await new Wallet(
      {
        chain: EvmChain.MOONBASE,
        chainType: ChainType.EVM,
        seed: '',
        address: '0x8D040B6E28f9b36b7edF443d03C63f88345B5010',
        nextNonce: 6,
        lastProcessedNonce: 5,
      },
      stage.context.blockchain,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Public Controller tests', () => {
    test('Get platform statistics', async () => {
      const response = await request(stage.http).get(`/public/statistics`);
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalUsers: 3,
        totalProjects: 2,
        //totalApiRequests: 0,
        //totalDevConsoleRequests: 0,
        totalWalletTransactions: 5,
      });
    });
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
        .get('/public/service-status')
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

    test('Authorized user should be able to filter service statuses', async () => {
      const createdServiceStatus = {
        message: 'Service unavailable',
        type: ServiceStatusType.ERROR,
        status: SqlModelStatus.DRAFT,
      };
      const data = await stage.db.devConsole.paramExecute(`
      INSERT INTO service_status (message, type, status)
      VALUES ('${createdServiceStatus.message}', '${createdServiceStatus.type}', '${createdServiceStatus.status}')`);

      const response = await request(stage.http)
        .get(`/public/service-status?status=${SqlModelStatus.DRAFT}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      const responseServiceStatus = response.body.data.items[0];
      expect(responseServiceStatus.id).toBeDefined();
      expect(responseServiceStatus.message).toBe(createdServiceStatus.message);
      expect(responseServiceStatus.type).toBe(createdServiceStatus.type);
      expect(responseServiceStatus.status).toBe(createdServiceStatus.status);
      expect(responseServiceStatus.url).toBeNull();

      const responseExpectingNoResults = await request(stage.http)
        .get(`/public/service-status?status=${SqlModelStatus.INACTIVE}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(responseExpectingNoResults.status).toBe(200);
      expect(responseExpectingNoResults.body.data.items).toHaveLength(0);
    });

    test('Unauthorized user should not be able to get service statuses', async () => {
      const response = await request(stage.http).get('/public/service-status');
      expect(response.status).toBe(401);
    });
  });
});
