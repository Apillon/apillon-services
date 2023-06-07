import { generateJwtToken, JwtTokenType } from '@apillon/lib';
import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { createTestUser, TestUser } from '@apillon/tests-lib';
import { ValidateEmailDto } from '../dtos/validate-email.dto';
import { setupTest } from '../../../../test/helpers/setup';
import { createTestKeyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';

describe('Auth tests', () => {
  let stage: Stage;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testUser: TestUser;
  let testUserKeyPair;
  const newUserData = {
    email: 'dev+test@apillon.io',
    password: 'MyPassword01!',
    authToken: null,
    user_uuid: null,
  };

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    const keyring = createTestKeyring();
    testUserKeyPair = keyring.addFromUri('//Alice');
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('User should be able to register', async () => {
    const input = new ValidateEmailDto({
      email: newUserData.email,
      captcha: { token: 'test' },
    });
    const response = await request(stage.http)
      .post('/users/validate-email')
      .send(input);
    expect(response.status).toBe(201);

    const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
      email: input.email,
    });
    const password = newUserData.password;

    const response2 = await request(stage.http)
      .post('/users/register')
      .send({ token, password });
    expect(response2.status).toBe(201);
    expect(response2.body.data.token).toBeTruthy();
    expect(response2.body.data.user_uuid).toBeTruthy();

    newUserData.authToken = response2.body.data.token;
    newUserData.user_uuid = response2.body.data.user_uuid;

    const sqlRes1 = await stage.devConsoleSql.paramExecute(
      `SELECT * from user WHERE user_uuid = @uuid`,
      { uuid: newUserData.user_uuid },
    );

    expect(sqlRes1.length).toBe(1);
    expect(sqlRes1[0].id).toBe(response2.body.data.id);

    const sqlRes2 = await stage.amsSql.paramExecute(
      `SELECT * from authUser WHERE user_uuid = @uuid`,
      { uuid: newUserData.user_uuid },
    );

    expect(sqlRes2.length).toBe(1);
    expect(sqlRes2[0].email).toBe(input.email);
  });

  test('User should be able to login', async () => {
    const response = await request(stage.http).post('/users/login').send({
      email: newUserData.email,
      password: newUserData.password,
    });
    expect(response.status).toBe(201);
    expect(response.body.data.token).toBeTruthy();

    newUserData.authToken = response.body.data.token;
  });

  test('User should not be able to login with wrong password', async () => {
    const response = await request(stage.http).post('/users/login').send({
      email: newUserData.email,
      password: newUserData.password.toLowerCase(),
    });
    expect(response.status).toBe(401);
  });

  test('User should not be able to login with wrong email', async () => {
    const response = await request(stage.http)
      .post('/users/login')
      .send({
        email: newUserData.email + 'x',
        password: newUserData.password,
      });
    expect(response.status).toBe(401);
  });

  test('User should be able to authenticate with token', async () => {
    const response = await request(stage.http)
      .get('/users/me')
      .set('Authorization', `Bearer ${newUserData.authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBeTruthy();
  });

  test('User should NOT be able to authenticate with old token', async () => {
    const oldToken = newUserData.authToken;

    // Tokens are time based, so this test might fail sometimes if it
    // executes too fast
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, 1000);
    });

    const response1 = await request(stage.http).post('/users/login').send({
      email: newUserData.email,
      password: newUserData.password,
    });
    expect(response1.status).toBe(201);

    newUserData.authToken = response1.body.data.token;
    const response = await request(stage.http)
      .get('/users/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(response.status).toBe(401);
  });

  test('User should be able to update profile', async () => {
    const response = await request(stage.http)
      .patch('/users/me')
      .send({
        name: 'My name',
      })
      .set('Authorization', `Bearer ${newUserData.authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('My name');
  });

  test('User should be able to request password reset', async () => {
    const response = await request(stage.http)
      .post('/users/password-reset-request')
      .send({
        email: newUserData.email,
      });
    expect(response.status).toBe(200);
  });

  test('User should be able to reset password & login with new password', async () => {
    const token = generateJwtToken(JwtTokenType.USER_RESET_PASSWORD, {
      email: newUserData.email,
    });

    const response = await request(stage.http)
      .post('/users/password-reset')
      .send({
        token: token,
        password: 'MyNewPassword01!',
      });
    expect(response.status).toBe(200);

    const response2 = await request(stage.http).post('/users/login').send({
      email: newUserData.email,
      password: 'MyNewPassword01!',
    });
    expect(response2.status).toBe(201);
    expect(response2.body.data.token).toBeTruthy();

    newUserData.authToken = response2.body.data.token;
    newUserData.password = 'MyNewPassword01!';
  });

  test('User should be able to connect with polkadot wallet', async () => {
    const authMsgResp = await request(stage.http).get('/users/auth-msg');
    expect(authMsgResp.status).toBe(200);

    const signature = u8aToHex(
      testUserKeyPair.sign(authMsgResp.body.data.message),
    );

    const connectResp = await request(stage.http)
      .post('/users/wallet-connect')
      .send({
        wallet: testUserKeyPair.address,
        signature,
        timestamp: authMsgResp.body.data.timestamp,
      })
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(connectResp.status).toBe(200);
    expect(connectResp.body.data.wallet).toBe(testUserKeyPair.address);

    const meResp = await request(stage.http)
      .get('/users/me')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(meResp.status).toBe(200);
    expect(meResp.body.data.wallet).toBe(testUserKeyPair.address);
  });

  test('User should be able to login with polkadot wallet', async () => {
    const authMsgResp = await request(stage.http).get('/users/auth-msg');
    expect(authMsgResp.status).toBe(200);

    const signature = u8aToHex(
      testUserKeyPair.sign(authMsgResp.body.data.message),
    );

    const connectResp = await request(stage.http)
      .post('/users/login/wallet')
      .send({
        wallet: testUserKeyPair.address,
        signature,
        timestamp: authMsgResp.body.data.timestamp,
      });

    expect(connectResp.status).toBe(200);
    expect(connectResp.body.data.wallet).toBe(testUserKeyPair.address);
    expect(connectResp.body.data.token).toBeTruthy();
    expect(connectResp.body.data.id).toBe(testUser.user.id);
  });

  test('User should NOT BE able to login with invalid signature or unconnected wallet', async () => {
    const keyring = createTestKeyring();
    const keyPair = keyring.addFromUri('//Bob');

    const authMsgResp = await request(stage.http).get('/users/auth-msg');
    expect(authMsgResp.status).toBe(200);

    const signature = u8aToHex(keyPair.sign(authMsgResp.body.data.message));

    const connectResp = await request(stage.http)
      .post('/users/login/wallet')
      .send({
        wallet: testUserKeyPair.address,
        signature,
        timestamp: authMsgResp.body.data.timestamp,
      });

    expect(connectResp.status).toBe(401);

    const connectResp2 = await request(stage.http)
      .post('/users/login/wallet')
      .send({
        wallet: keyPair.address,
        signature,
        timestamp: authMsgResp.body.data.timestamp,
      });

    expect(connectResp2.status).toBe(401);
  });

  test('Kilt login: Existing user should be able to login', async () => {
    const tokenKilt = generateJwtToken(
      JwtTokenType.USER_AUTHENTICATION,
      { email: newUserData.email },
      '10min',
    );

    const resp = await request(stage.http)
      .post('/users/login-kilt')
      .send({ token: tokenKilt });
    expect(resp.status).toBe(201);
  });

  test('Kilt login: New user should be able to login', async () => {
    const controlEmail = 'dims.okniv@kalmia.si';
    const tokenKiltNew = generateJwtToken(
      JwtTokenType.USER_AUTHENTICATION,
      { email: controlEmail },
      '10min',
    );

    const resp1 = await request(stage.http)
      .post('/users/login-kilt')
      .send({ token: tokenKiltNew });
    expect(resp1.status).toBe(201);
    expect(resp1.body.data.token).toBeTruthy();
    expect(resp1.body.data.user_uuid).toBeTruthy();

    const userData = resp1.body.data;
    const sqlRes1 = await stage.devConsoleSql.paramExecute(
      `SELECT * from user WHERE user_uuid = @uuid`,
      { uuid: userData.user_uuid },
    );

    expect(sqlRes1.length).toBe(1);
    expect(sqlRes1[0].id).toBe(resp1.body.data.id);

    const sqlRes2 = await stage.amsSql.paramExecute(
      `SELECT * from authUser WHERE user_uuid = @uuid`,
      { uuid: userData.user_uuid },
    );

    expect(sqlRes2.length).toBe(1);
    expect(sqlRes2[0].email).toBe(controlEmail);
  });
});
