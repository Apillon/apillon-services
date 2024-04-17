import {
  generateJwtToken,
  getFaker,
  JwtExpireTime,
  JwtTokenType,
  parseJwtToken,
} from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import { ValidateEmailDto } from '../dtos/validate-email.dto';
import { setupTest } from '../../../../test/helpers/setup';
import { createTestKeyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';

describe('Auth tests', () => {
  let stage: Stage;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testUser: TestUser;
  let testUserKeyPair;
  let testUserKeyPair2;
  const newUserData = {
    email: getFaker().internet.email(),
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

    const keyring = createTestKeyring();
    testUserKeyPair = keyring.addFromUri('//Alice');
    testUserKeyPair2 = keyring.addFromUri('//Bob');

    await stage.context.access.mysql.paramExecute(
      `UPDATE authUser SET wallet = '${testUserKeyPair.address}' WHERE user_uuid = '${testUser.authUser.user_uuid}'`,
    );
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

    const sqlRes1 = await stage.db.devConsole.paramExecute(
      `SELECT * from user WHERE user_uuid = @uuid`,
      { uuid: newUserData.user_uuid },
    );

    expect(sqlRes1.length).toBe(1);
    expect(sqlRes1[0].user_uuid).toBe(response2.body.data.user_uuid);

    const sqlRes2 = await stage.db.access.paramExecute(
      `SELECT * from authUser WHERE user_uuid = @uuid`,
      { uuid: newUserData.user_uuid },
    );

    expect(sqlRes2.length).toBe(1);
    expect(sqlRes2[0].email).toBe(input.email.toLowerCase());
  });

  test('User should be able to login', async () => {
    const response = await request(stage.http).post('/users/login').send({
      email: newUserData.email,
      password: newUserData.password,
    });
    expect(response.status).toBe(201);
    expect(response.body.data.token).toBeTruthy();
    expect(response.body.data.user_uuid).toBeTruthy();
    expect(response.body.data.id).toBeFalsy();

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
        email: `${newUserData.email}x`,
        password: newUserData.password,
      });
    expect(response.status).toBe(401);
  });

  test('User should be able to authenticate with token', async () => {
    const response = await request(stage.http)
      .get('/users/me')
      .set('Authorization', `Bearer ${newUserData.authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.user_uuid).toBeTruthy();
    expect(response.body.data.id).toBeFalsy();
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
        captcha: { token: 'test' },
      });
    expect(response.status).toBe(200);
  });

  test('User should be able to reset password & login with new password', async () => {
    const token = generateJwtToken(
      JwtTokenType.USER_RESET_PASSWORD,
      { email: testUser.authUser.email },
      JwtExpireTime.ONE_HOUR,
      testUser.authUser.password,
    );

    const response = await request(stage.http)
      .post('/users/password-reset')
      .send({
        token,
        password: 'MyNewPassword01!',
      });
    expect(response.status).toBe(200);

    const response2 = await request(stage.http).post('/users/login').send({
      email: testUser.authUser.email,
      password: 'MyNewPassword01!',
    });
    expect(response2.status).toBe(201);
    expect(response2.body.data.token).toBeTruthy();

    testUser.token = response2.body.data.token;
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
    // wait 1 second to avoid getting signature already used error because of same timestamp
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
    expect(connectResp.body.data.user_uuid).toBe(testUser.user.user_uuid);
  });

  test('User should be able to register with wallet', async () => {
    const email = 'wallet-register@gmail.com';
    const wallet = testUserKeyPair2.address;

    const input = new ValidateEmailDto({
      email,
      wallet,
      captcha: { token: 'test' },
    });
    // Test invalid signature response
    let response = await request(stage.http)
      .post('/users/validate-email')
      .send(input);
    expect(response.status).toBe(401);
    expect(response.body.message).toEqual('INVALID_SIGNATURE');

    const authMsgResp = await request(stage.http).get('/users/auth-msg');
    expect(authMsgResp.status).toBe(200);

    input.signature = u8aToHex(
      testUserKeyPair2.sign(authMsgResp.body.data.message),
    );
    input.timestamp = authMsgResp.body.data.timestamp;
    response = await request(stage.http)
      .post('/users/validate-email')
      .send(input);
    expect(response.status).toBe(201);

    const token = generateJwtToken(
      JwtTokenType.USER_CONFIRM_EMAIL,
      { email, wallet },
      JwtExpireTime.ONE_HOUR,
    );

    response = await request(stage.http)
      .post('/users/register')
      .send({ token });
    expect(response.status).toBe(201);
    expect(response.body.data.email).toEqual(email);
  });

  test('User should NOT BE able to login with invalid signature or unconnected wallet', async () => {
    const keyring = createTestKeyring();

    const keyPair = keyring.addFromUri('//Dave');

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
    expect(connectResp.body.message).toEqual('INVALID_SIGNATURE');

    const connectResp2 = await request(stage.http)
      .post('/users/login/wallet')
      .send({
        wallet: keyPair.address,
        signature,
        timestamp: authMsgResp.body.data.timestamp,
      });

    expect(connectResp2.status).toBe(401);
    expect(connectResp2.body.message).toEqual('USER_IS_NOT_AUTHENTICATED');
  });

  test('Kilt login: Existing user should be able to login', async () => {
    const tokenKilt = generateJwtToken(
      JwtTokenType.OAUTH_TOKEN,
      { email: newUserData.email },
      JwtExpireTime.TWENTY_MINUTES,
    );

    const resp = await request(stage.http)
      .post('/users/login-kilt')
      .send({ token: tokenKilt });
    expect(resp.status).toBe(201);
  });

  // NOTE: Requires env variables APILLON_API_INTEGRATION_API_KEY and env.APILLON_API_INTEGRATION_API_SECRET
  test('Kilt login: New user should be able to login', async () => {
    const controlEmail = 'dims.okniv@kalmia.si';
    const tokenKiltNew = generateJwtToken(
      JwtTokenType.OAUTH_TOKEN,
      { email: controlEmail },
      JwtExpireTime.TWENTY_MINUTES,
    );

    const resp1 = await request(stage.http)
      .post('/users/login-kilt')
      .send({ token: tokenKiltNew });
    expect(resp1.status).toBe(201);
    expect(resp1.body.data.token).toBeTruthy();
    expect(resp1.body.data.user_uuid).toBeTruthy();

    const userData = resp1.body.data;
    const sqlRes1 = await stage.db.devConsole.paramExecute(
      `SELECT * from user WHERE user_uuid = @uuid`,
      { uuid: userData.user_uuid },
    );

    expect(sqlRes1.length).toBe(1);
    expect(sqlRes1[0].user_uuid).toBe(resp1.body.data.user_uuid);

    const sqlRes2 = await stage.db.access.paramExecute(
      `SELECT * from authUser WHERE user_uuid = @uuid`,
      { uuid: userData.user_uuid },
    );

    expect(sqlRes2.length).toBe(1);
    expect(sqlRes2[0].email).toBe(controlEmail);
  });

  // NOTE: Requires env variables APILLON_API_INTEGRATION_API_KEY and env.APILLON_API_INTEGRATION_API_SECRET
  test('Should be able to get OAuth session', async () => {
    const resp = await request(stage.http).get('/users/oauth-session');
    expect(resp.status).toBe(200);
    expect(resp.body.data.sessionToken).toBeTruthy();
    expect(typeof resp.body.data.sessionToken).toBe('string');

    const tokenData = parseJwtToken(
      JwtTokenType.AUTH_SESSION,
      resp.body.data.sessionToken,
    );
    expect(tokenData.project_uuid).toBeTruthy();
  });
});
