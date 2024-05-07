import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, EvmChain } from '@apillon/lib';
import {
  Stage,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

describe('Public controller tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
    const user1 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    const user2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    await createTestUser(stage.context.devConsole, stage.context.access);

    await createTestProject(user1, stage);
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
        totalApiRequests: 0,
        totalDevConsoleRequests: 0,
        totalWalletTransactions: 5,
      });
    });
  });
});
