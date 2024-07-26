import { EvmChain, SqlModelStatus } from '@apillon/lib';
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

    // await stage.db.referral.paramExecute(
    //   `INSERT INTO ${DbTables.GALXE_WALLET} (wallet) VALUES (${blockchain.getWalletAddress(0)})`,
    // );
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
      // 10 for registering
      expect(response.body.data.airdropStats.totalPoints).toEqual(10);
    });

    test('User should receive 401 if not authenticated', async () => {
      const response = await request(stage.http).get(`/referral/airdrop-tasks`);
      expect(response.status).toBe(401);
    });
  });

  describe('Airdrop claim tests', () => {
    /**
     * Requires environment variables:
     * AIRDROP_CLAIM_TIMESTAMP
     * AIRDROP_CLAIM_CONTRACT_ADDRESS
     * AIRDROP_CLAIM_SIGNER_KEY
     * AIRDROP_CLAIM_CHAIN_ID
     */
    test('User should successfully get claim parameters if eligible', async () => {
      const response = await request(stage.http)
        .get('/referral/claim-parameters')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.amount).toBe(10);
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.signature).toBeDefined();
    });

    test('User should receive 403 if claim is forbidden due to BLOCKED status', async () => {
      const response = await request(stage.http)
        .get('/referral/claim-parameters')
        .set('Authorization', `Bearer ${testUser2.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('CLAIM_FORBIDDEN');
    });

    test('User should receive 400 if claim is already completed', async () => {
      // Manually set the user's claim to completed
      await stage.db.referral.paramExecute(
        `UPDATE token_claim SET claimCompleted = TRUE WHERE user_uuid = '${testUser.user.user_uuid}'`,
      );

      const response = await request(stage.http)
        .get('/referral/claim-parameters')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('CLAIM_ALREADY_COMPLETED');
    });
  });
});
