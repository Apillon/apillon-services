import {
  Stage,
  TestUser,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';

describe('Product Hunt Comment e2e tests', () => {
  let stage: Stage;

  let testUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest();

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Create comment tests', () => {
    afterAll(async () => {
      await stage.db.referral.paramExecute(`DELETE FROM product_hunt_comment`);
    });
    test('User can create & update a product hunt comment', async () => {
      const createDto = {
        url: 'https://www.producthunt.com/posts/1',
        username: 'username',
      };
      const response = await request(stage.http)
        .post('/product-hunt')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(createDto);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.url).toBe(createDto.url);
      expect(response.body.data.username).toBe(createDto.username);
      expect(response.body.createTime).toBeUndefined();

      const updateDto = {
        url: 'https://www.producthunt.com/posts/2',
        username: 'username2',
      };

      const updateResponse = await request(stage.http)
        .post('/product-hunt')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updateDto);

      expect(updateResponse.status).toBe(201);
      expect(updateResponse.body).toBeDefined();
      expect(updateResponse.body.data.id).toBe(response.body.data.id);
      expect(updateResponse.body.data.url).toBe(updateDto.url);
      expect(updateResponse.body.data.username).toBe(updateDto.username);
      expect(updateResponse.body.data.createTime).toBeUndefined();
    });
  });

  describe('Get comment tests', () => {
    test('User cannot get a comment when it does not exist', async () => {
      const response = await request(stage.http)
        .get('/product-hunt')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
    });

    test('User can get a comment', async () => {
      const createDto = {
        url: 'https://www.producthunt.com/posts/1',
        username: 'username',
      };
      const createResponse = await request(stage.http)
        .post('/product-hunt')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(createDto);

      const response = await request(stage.http)
        .get(`/product-hunt`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.data.id).toBe(createResponse.body.data.id);
      expect(response.body.data.url).toBe(createDto.url);
      expect(response.body.data.username).toBe(createDto.username);
      expect(response.body.data.createTime).toBeUndefined();
    });
  });
});
