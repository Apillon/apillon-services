import { ReviewTasksDto, EvmChain, SqlModelStatus } from '@apillon/lib';
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

  const claimBody = async (walletIndex: number) => {
    const timestamp = new Date().getTime();
    const message = `Please sign this message.\n${timestamp}`;
    // Timeout to avoid invalid signature eror because of timestamp
    await new Promise((resolve) => setTimeout(() => resolve(true), 2000));

    const signature = await new ethers.Wallet(
      blockchain.getWalletPrivateKey(walletIndex),
    ).signMessage(message);

    return new ReviewTasksDto()
      .fake()
      .populate({
        wallet: blockchain.getWalletAddress(walletIndex),
        signature,
        isEvmWallet: true,
        timestamp,
      })
      .serialize();
  };

  describe('NCTR airdrop tests', () => {
    test('User should be able to get his stats regarding airdrop rewards', async () => {
      const response = await request(stage.http)
        .get(`/referral/airdrop-tasks`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      // 10 for registering and 10 for galxe points
      expect(response.body.data.totalPoints).toEqual(20);
    });

    test('User should receive 401 if not authenticated', async () => {
      const response = await request(stage.http).get(`/referral/airdrop-tasks`);
      expect(response.status).toBe(401);
    });

    test('User should successfully claim tokens if all conditions are met', async () => {
      const body = await claimBody(0);
      const response = await request(stage.http)
        .post('/referral/review-tasks')
        .send(body)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(201);
      expect(response.body.data.totalPoints).toBeGreaterThanOrEqual(10);

      const { 0: tokenClaim } = await stage.db.referral.paramExecute(
        `SELECT * FROM token_claim`,
      );
      expect(tokenClaim.user_uuid).toEqual(testUser.user.user_uuid);
      expect(tokenClaim.fingerprint).toEqual(body.fingerprint);
      expect(tokenClaim.wallet.toLowerCase()).toEqual(
        body.wallet.toLowerCase(),
      );
      expect(tokenClaim.totalClaimed).toEqual(response.body.data.totalPoints);
    });

    test('User should receive 403 if trying to claim from same IP and fingerprint', async () => {
      const body = await claimBody(1);

      // Claim for the first time
      let response = await request(stage.http)
        .post('/referral/review-tasks')
        .send(body)
        .set('Authorization', `Bearer ${testUser2.token}`);

      expect(response.status).toBe(201);

      // Another usser attempts to claim with the same IP and fingerprint
      response = await request(stage.http)
        .post('/referral/review-tasks')
        .send(body)
        .set('Authorization', `Bearer ${testUser3.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('CLAIM_FORBIDDEN');

      const tokenClaims = await stage.db.referral.paramExecute(
        `SELECT * FROM token_claim`,
      );
      // Verify that both users with same IP and fingerprint got blocked
      expect(
        tokenClaims.filter((t) => t.status === SqlModelStatus.BLOCKED),
      ).toHaveLength(2);
    });

    test('User should receive 400 if trying to claim more than once', async () => {
      // Attempt to claim again
      const response = await request(stage.http)
        .post('/referral/review-tasks')
        .send(await claimBody(0))
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('TASKS_ALREADY_REVIEWED');
    });
  });
});
