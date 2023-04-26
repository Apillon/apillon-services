import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { createTestUser, TestUser } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';

describe('User consents tests', () => {
  let stage: Stage;

  let testUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('API should return active terms', async () => {
    const resp = await request(stage.http)
      .get('/users/terms')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(200);
  });

  test.todo('User should see terms on login');
  test.todo('User should be able to accept terms');
  test.todo('User should be able to decline terms');
  test.todo('User should see new terms');
  test.todo('User should not be able to decline required terms');
});
