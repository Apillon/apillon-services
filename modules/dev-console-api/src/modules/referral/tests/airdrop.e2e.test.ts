import { EvmChain } from '@apillon/lib';
import {
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
  TestBlockchain,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { UserAirdropTask } from '@apillon/referral/src/modules/airdrop/models/user-airdrop-task.model';
import { DbTables } from '@apillon/referral/src/config/types';
import { ethers } from 'ethers';

describe('Airdrop tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;
  let blockchain: TestBlockchain;

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
    testUser3 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );

    await Promise.all(
      [testUser, testUser2, testUser3].map(({ user }) =>
        new UserAirdropTask(
          { user_uuid: user.user_uuid, totalPoints: 10 },
          stage.context.referral,
        ).insert(),
      ),
    );

    blockchain = TestBlockchain.fromStage(stage, EvmChain.ASTAR);
    await blockchain.start();

    await stage.db.referral.paramExecute(
      `INSERT INTO ${DbTables.GALXE_WALLET} (wallet) VALUES (${blockchain.getWalletAddress(0)})`,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
    if (blockchain) {
      await blockchain.stop();
    }
  });

  describe('NCTR airdrop tests', () => {
    test('User should be able to get his stats regarding airdrop rewards', async () => {
      const response = await request(stage.http)
        .get(`/referral/airdrop-tasks`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.airdropStats).toBeDefined();
      expect(response.body.data.tokenClaim).toBeDefined();
      // 10 for registering and 10 for galxe points
      expect(response.body.data.airdropStats.totalPoints).toEqual(20);
    });

    test('User should receive 401 if not authenticated', async () => {
      const response = await request(stage.http).get(`/referral/airdrop-tasks`);
      expect(response.status).toBe(401);
    });
  });
});
