import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { createTestUser, TestUser } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { OauthLinkType } from '@apillon/lib';

describe('oAuth connections tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('User should be able to connect with discord', async () => {
    const resp = await request(stage.http)
      .post('/users/discord-connect')
      .send({ code: 12345 })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(201);

    const resp2 = await request(stage.http)
      .get('/users/oauth-links')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp2.status).toBe(200);

    expect(
      resp2.body.data.data.find(
        (x) =>
          x.user_uuid === testUser.user.user_uuid &&
          x.type === OauthLinkType.DISCORD &&
          x.externalUserId == 12345,
      ),
    ).toBeTruthy();
  });

  test('User should not be able to connect with another discord account', async () => {
    const resp = await request(stage.http)
      .post('/users/discord-connect')
      .send({ code: 54321 })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(400);
  });

  test('User should be able to disconnect from discord', async () => {
    const resp = await request(stage.http)
      .post('/users/discord-disconnect')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(200);

    const resp2 = await request(stage.http)
      .get('/users/oauth-links')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp2.status).toBe(200);

    expect(
      resp2.body.data.data.find(
        (x) =>
          x.user_uuid === testUser.user.user_uuid &&
          x.type === OauthLinkType.DISCORD,
      ),
    ).toBeFalsy();
  });

  test('User should be able to connect with another discord account if he disconnected previous', async () => {
    const resp = await request(stage.http)
      .post('/users/discord-connect')
      .send({ code: 54321 })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(201);

    const resp2 = await request(stage.http)
      .get('/users/oauth-links')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp2.status).toBe(200);

    expect(
      resp2.body.data.data.find(
        (x) =>
          x.user_uuid === testUser.user.user_uuid &&
          x.type === OauthLinkType.DISCORD &&
          x.externalUserId == 54321,
      ),
    ).toBeTruthy();
  });

  test('Another user should be able to take over existing discord account', async () => {
    const resp = await request(stage.http)
      .post('/users/discord-connect')
      .send({ code: 54321 })
      .set('Authorization', `Bearer ${testUser2.token}`);
    expect(resp.status).toBe(201);

    const resp2 = await request(stage.http)
      .get('/users/oauth-links')
      .set('Authorization', `Bearer ${testUser2.token}`);
    expect(resp2.status).toBe(200);

    expect(
      resp2.body.data.data.find(
        (x) =>
          x.user_uuid === testUser2.user.user_uuid &&
          x.type === OauthLinkType.DISCORD &&
          x.externalUserId == 54321,
      ),
    ).toBeTruthy();

    const resp3 = await request(stage.http)
      .get('/users/oauth-links')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp3.status).toBe(200);

    expect(
      resp3.body.data.data.find(
        (x) =>
          x.user_uuid === testUser.user.user_uuid &&
          x.type === OauthLinkType.DISCORD &&
          x.externalUserId == 54321,
      ),
    ).toBeFalsy();
  });

  test('Unauthorized user should not be able to connect to discord', async () => {
    const resp = await request(stage.http)
      .post('/users/discord-connect')
      .send({ code: 123456 });
    expect(resp.status).toBe(401);
  });
});
