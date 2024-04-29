import {
  ClaimTokensDto,
  EvmChain,
  generateJwtToken,
  isEVMWallet,
  JwtTokenType,
  SqlModelStatus,
} from '@apillon/lib';
import {
  DbTables,
  TransactionDirection,
} from '@apillon/referral/src/config/types';
import { Player } from '@apillon/referral/src/modules/referral/models/player.model';
import {
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
  createTestReferralProduct,
  TestBlockchain,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { ethers } from 'ethers';

describe('Referral tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testUser2: TestUser;
  let blockchain: TestBlockchain;

  let product: any;

  let refCode: string;
  let playerId: string;

  const newUserData = {
    email: 'dev+test@apillon.io',
    password: 'MyPassword01!',
    authToken: null,
    user_uuid: null,
  };

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
    // const project = await createTestProject(testUser, stage, 7000);
    // await createTestReferralTasks(stage.context.referral);
    product = await createTestReferralProduct(stage.context.referral);

    blockchain = TestBlockchain.fromStage(stage, EvmChain.ASTAR);
    await blockchain.start();
  });

  afterAll(async () => {
    await releaseStage(stage);
    if (blockchain) {
      await blockchain.stop();
    }
  });

  describe('Create referral player tests', () => {
    test('User should be able to create referral player', async () => {
      const response = await request(stage.http)
        .post(`/referral`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.refCode).toHaveLength(5);
      playerId = response.body.data.id;
      refCode = response.body.data.refCode;
    });

    test('User should be able to refer others', async () => {
      const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
        email: newUserData.email,
        refCode,
      });
      const password = newUserData.password;

      const response = await request(stage.http)
        .post('/users/register')
        .send({ token, password });
      expect(response.status).toBe(201);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.user_uuid).toBeTruthy();

      newUserData.authToken = response.body.data.token;
      newUserData.user_uuid = response.body.data.user_uuid;

      const player = await new Player(
        {},
        stage.context.referral,
      ).populateByUserUuid(newUserData.user_uuid);

      expect(player.referrer_id).toBe(playerId);
    });
  });

  describe('Get referral player tests', () => {
    test('User should be able to get referral', async () => {
      const response = await request(stage.http)
        .get(`/referral`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.tasks).toHaveLength(4);
    });
  });

  describe.skip('Twitter', () => {
    test('User should be able to get twitter authentication link', async () => {
      const response = await request(stage.http)
        .get(`/referral/twitter/authenticate`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.url).toBeTruthy();
    });

    test('User should be able to get latest tweets', async () => {
      const response = await request(stage.http)
        .get(`/referral/twitter/tweets`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(4);
    });

    test('Confirm user retweet', async () => {
      await stage.db.referral.paramExecute(
        `
        UPDATE ${DbTables.PLAYER}
        SET twitter_id = @twitter_id
        WHERE user_uuid = @uuid
      `,
        {
          twitter_id: '1529013336754507778', // Kalmia twitter
          uuid: testUser.user.user_uuid,
        },
      );
      const response = await request(stage.http)
        .post(`/referral/twitter/confirm`)
        .send({ tweet_id: '1600474958685409280' }) // tweet that Kalmia account retweeted
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.player.balance).toBe(1);
    });

    test('Unlink Twitter', async () => {
      const response = await request(stage.http)
        .post(`/referral/twitter/unlink`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.twitter_id).toBe(null);
    });
  });

  describe.skip('Shop', () => {
    test('User should be able to get products', async () => {
      const response = await request(stage.http)
        .get(`/referral/products`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2); // One from seed and one test product
    });
    test('User should not be able to order product with insufficient balance', async () => {
      const response = await request(stage.http)
        .post(`/referral/product`)
        .send({ id: product.id })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
    });
    test('User should be able to order product with sufficient balance once', async () => {
      await stage.db.referral.paramExecute(
        `
        INSERT INTO ${DbTables.TRANSACTION} (player_id, direction, amount, status)
        VALUES (@player_id, ${TransactionDirection.DEPOSIT}, 14, 5)
      `,
        {
          player_id: playerId,
        },
      );
      const response = await request(stage.http)
        .post(`/referral/product`)
        .send({
          id: product.id,
          info: {
            firstName: 'Test',
            lastName: 'Testić',
            street: 'Kapucinski trg 7',
            postalCode: 4220,
            country: 'Slovenia',
          },
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      await stage.db.referral.paramExecute(
        `
      INSERT INTO ${DbTables.TRANSACTION} (player_id, direction, amount, status)
      VALUES (@player_id, ${TransactionDirection.DEPOSIT}, 14, 5)
    `,
        {
          player_id: playerId,
        },
      );

      // Should not be able to order twice
      const response2 = await request(stage.http)
        .post(`/referral/product`)
        .send({ id: product.id })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response2.status).toBe(400);
    });
  });

  const claimBody = async (walletIndex: number) => {
    const timestamp = new Date().getTime();
    const message = `Please sign this message.\n${timestamp}`;
    // Timeout to avoid invalid signature eror because of timestamp
    await new Promise((resolve) => setTimeout(() => resolve(true), 2000));

    const signature = await new ethers.Wallet(
      blockchain.getWalletPrivateKey(walletIndex),
    ).signMessage(message);

    return new ClaimTokensDto()
      .fake()
      .populate({
        wallet: blockchain.getWalletAddress(walletIndex),
        signature,
        isEvmWallet: true,
        timestamp,
      })
      .serialize();
  };

  describe('Airdrop tests', () => {
    test('User should be able to get his stats regarding airdrop rewards', async () => {
      const response = await request(stage.http)
        .get(`/referral/airdrop-tasks`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.totalPoints).toBeGreaterThanOrEqual(10);
    });

    test('User should successfully claim tokens if all conditions are met', async () => {
      const body = await claimBody(0);
      const response = await request(stage.http)
        .post('/referral/claim-tokens')
        .send(body)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBeTruthy();
      expect(response.body.totalClaimed).toBeGreaterThanOrEqual(10);

      const data = await stage.db.referral.paramExecute(
        `SELECT * FROM token_claim`,
      );
      const tokenClaim = data[0];
      expect(tokenClaim.user_uuid).toEqual(testUser.user.user_uuid);
      expect(tokenClaim.fingerprint).toEqual(body.fingerprint);
      expect(tokenClaim.wallet).toEqual(body.wallet);
      expect(tokenClaim.totalClaimed).toEqual(response.body.totalClaimed);
    });

    test('User should receive an error if trying to claim more than once', async () => {
      const response = await request(stage.http)
        .post('/referral/claim-tokens')
        .send(await claimBody(0))
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('USER_ALREADY_CLAIMED');
      const data = await stage.db.referral.paramExecute(
        `SELECT * FROM token_claim`,
      );
      // Only 1 claim
      expect(data).toHaveLength(1);
    });

    test('User should be blocked if claiming from same IP and fingerprint', async () => {
      let response = await request(stage.http)
        .post('/referral/claim-tokens')
        .send(await claimBody(0))
        .set('Authorization', `Bearer ${testUser2.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('CLAIM_FORBIDDEN');

      // If blocked user tries to claim with different fingerprint
      response = await request(stage.http)
        .post('/referral/claim-tokens')
        .send({
          ...(await claimBody(0)),
          fingerprint: '654321',
        })
        .set('Authorization', `Bearer ${testUser2.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('CLAIM_FORBIDDEN');

      // Only 2 claims, second is blocked
      const data = await stage.db.referral.paramExecute(
        `SELECT * FROM token_claim`,
      );
      expect(data).toHaveLength(2);
      expect(data[1].status).toEqual(SqlModelStatus.BLOCKED);
    });
  });
});
