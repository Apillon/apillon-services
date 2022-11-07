import { generateJwtToken, JwtTokenType } from '@apillon/lib';
import * as request from 'supertest';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';

describe('Auth tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  const newUserData = {
    email: 'tine+test@kalmia.si',
    password: 'MyPassword01!',
    authToken: null,
    user_uuid: null,
  };

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('User should be able to register', async () => {
    const email = newUserData.email;
    const response = await request(stage.http)
      .post('/user/validate-email')
      .send({ email });
    expect(response.status).toBe(201);

    const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, { email });
    const password = newUserData.password;

    const response2 = await request(stage.http)
      .post('/user/register')
      .send({ token, password });
    expect(response2.status).toBe(201);
    expect(response2.body.token).toBeTruthy();
    expect(response2.body.user_uuid).toBeTruthy();

    newUserData.authToken = response2.body.token;
    newUserData.user_uuid = response2.body.user_uuid;

    const sqlRes1 = await stage.devConsoleSql.paramExecute(
      `SELECT * from user WHERE user_uuid = @uuid`,
      { uuid: newUserData.user_uuid },
    );

    expect(sqlRes1.length).toBe(1);
    expect(sqlRes1[0].id).toBe(response2.body.id);

    const sqlRes2 = await stage.amsSql.paramExecute(
      `SELECT * from authUser WHERE user_uuid = @uuid`,
      { uuid: newUserData.user_uuid },
    );

    expect(sqlRes2.length).toBe(1);
    expect(sqlRes2[0].email).toBe(email);
  });

  test('User should be able to login', async () => {
    const response = await request(stage.http).post('/user/login').send({
      email: newUserData.email,
      password: newUserData.password,
    });
    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();

    newUserData.authToken = response.body.token;
  });

  test('User should not be able to login with wrong password', async () => {
    const response = await request(stage.http).post('/user/login').send({
      email: newUserData.email,
      password: newUserData.password.toLowerCase(),
    });
    expect(response.status).toBe(401);
  });

  test('User should not be able to login with wrong email', async () => {
    const response = await request(stage.http)
      .post('/user/login')
      .send({
        email: newUserData.email + 'x',
        password: newUserData.password,
      });
    expect(response.status).toBe(401);
  });

  test('User should be able to authenticate with token', async () => {
    const response = await request(stage.http)
      .get('/user/me')
      .set('Authorization', `Bearer ${newUserData.authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBeTruthy();
  });

  test('User should NOT be able to authenticate with old token', async () => {
    const oldToken = newUserData.authToken;

    const response1 = await request(stage.http).post('/user/login').send({
      email: newUserData.email,
      password: newUserData.password,
    });
    expect(response1.status).toBe(201);

    const response = await request(stage.http)
      .get('/user/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(response.status).toBe(401);
  });
});
