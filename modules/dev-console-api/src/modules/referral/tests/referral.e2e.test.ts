import { generateJwtToken, JwtTokenType } from '@apillon/lib';
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
  createTestReferralTasks,
  createTestReferralProduct,
  createTestProject,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

describe('Referral tests', () => {
  let stage: Stage;

  let testUser: TestUser;

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
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    const project = await createTestProject(testUser, stage, 7000);
    // await createTestReferralTasks(stage.referralContext);
    product = await createTestReferralProduct(stage.referralContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Create referral player tests', () => {
    test('User should be able to create referral player', async () => {
      const response = await request(stage.http)
        .post(`/referral`)
        .send({ termsAccepted: true })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.refCode).toHaveLength(5);
      expect(response.body.data.termsAccepted).toBeTruthy();
      playerId = response.body.data.id;
      refCode = response.body.data.refCode;
    });

    test('User should be able to refer others', async () => {
      const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
        email: newUserData.email,
      });
      const password = newUserData.password;

      const response = await request(stage.http)
        .post('/users/register')
        .send({ token, password, refCode });
      expect(response.status).toBe(201);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.user_uuid).toBeTruthy();

      newUserData.authToken = response.body.data.token;
      newUserData.user_uuid = response.body.data.user_uuid;

      const player = await new Player(
        {},
        stage.referralContext,
      ).populateByUserUuid(newUserData.user_uuid);

      expect(player.referrer_id).toBe(playerId);
    });
  });

  describe('Get referral player tests', () => {
    test('User should not be able to get referral if did not accept terms', async () => {
      const response = await request(stage.http)
        .get(`/referral`)
        .set('Authorization', `Bearer ${newUserData.authToken}`);
      expect(response.status).toBe(400);
    });

    test('User should be able to get referral if he accepted terms', async () => {
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
      await stage.referralSql.paramExecute(
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

  describe('Shop', () => {
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
      await stage.referralSql.paramExecute(
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

      await stage.referralSql.paramExecute(
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
  
  describe('Airdrop', () => {
    test('User should be able to get his stats regarding airdrop rewards', async () => {
      const response = await request(stage.http)
        .get(`/referral/airdrop-tasks`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      console.log(response.body.data)
    });
  
  });
});
