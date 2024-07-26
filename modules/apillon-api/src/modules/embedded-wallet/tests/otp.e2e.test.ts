import {
  Stage,
  createTestApiKey,
  createTestProject,
  createTestUser,
  releaseStage,
  createTestProjectService,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
} from '@apillon/lib';

const clearOtps = async (stage: Stage) => {
  await stage.db.authentication.paramExecute(`DELETE FROM otp;`);
};

describe('OTP tests', () => {
  let stage: Stage;
  let token: string;

  beforeAll(async () => {
    stage = await setupTest();

    const testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    const testProject = await createTestProject(testUser, stage);
    const testService = await createTestProjectService(
      stage.context.devConsole,
      testProject,
    );

    const apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.WALLET,
      }),
    );

    const response = await request(stage.http)
      .get(`/embedded-wallet/session-token`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
        ).toString('base64')}`,
      );
    token = response.body.data.token;
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('OTP Generation tests', () => {
    afterAll(async () => {
      await clearOtps(stage);
    });

    test('User cannot create OTP without valid token', async () => {
      let response = await request(stage.http)
        .post('/embedded-wallet/otp/generate')
        .send({
          email: 'test@apillon.io',
        });

      expect(response.status).toBe(400);

      response = await request(stage.http)
        .post('/embedded-wallet/otp/generate')
        .send({
          email: 'test@apillon.io',
          token: 'invalid token',
        });

      expect(response.status).toBe(400);
    });

    test('Successfully create OTP', async () => {
      const email = 'test@apillon.io';
      const response = await request(stage.http)
        .post('/embedded-wallet/otp/generate')
        .send({
          email,
          token,
        });

      expect(response.status).toBe(200);
      const data = response.body.data;

      expect(data).toBeDefined();
      expect(data.email).toBe(email);
      expect(data.code).toBeFalsy();
      expect(data.expireTime).toBeDefined();

      const dbData = await stage.db.authentication.paramExecute(
        `SELECT * FROM otp WHERE email = '${email}'`,
      );

      expect(dbData).toHaveLength(1);
      const fetchedOtp = dbData[0];
      expect(fetchedOtp.id).toBeDefined();
      expect(fetchedOtp.email).toBe(email);
      expect(fetchedOtp.code).toBeDefined();
      expect(fetchedOtp.code).toHaveLength(6);
      expect(fetchedOtp.expireTime).toBeDefined();
      expect(fetchedOtp.used).toBe(0);
    });
  });

  describe('OTP Validation tests', () => {
    const email = 'test@apillon.io';
    const correctCode = '1A2B3C';

    beforeEach(async () => {
      await stage.db.authentication.paramExecute(
        `INSERT INTO otp (email, code, expireTime, used) VALUES (\'${email}\', \'${correctCode}\', NOW()+ INTERVAL 1 HOUR, 0)`,
      );
    });

    afterEach(async () => {
      await clearOtps(stage);
    });

    test('User cannot validate OPT without valid token', async () => {
      let response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email,
          code: correctCode,
        });

      expect(response.status).toBe(400);

      response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email,
          code: correctCode,
          token: 'invalid token',
        });

      expect(response.status).toBe(400);
    });

    test('Successfully validate OTP', async () => {
      const t = await stage.db.authentication.paramExecute(
        `SELECT * FROM otp WHERE email = '${email}'`,
      );

      const response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email,
          code: correctCode,
          token,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(true);

      const dbData = await stage.db.authentication.paramExecute(
        `SELECT * FROM otp WHERE email = '${email}'`,
      );

      expect(dbData).toHaveLength(1);
      const fetchedOtp = dbData[0];
      expect(fetchedOtp.used).toBe(1);
    });

    test('Fail to validate OTP with incorrect code', async () => {
      const response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email,
          code: '1C2B3A',
          token,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(false);
    });

    test('Fail to validate OTP with incorrect email', async () => {
      const response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email: 'test-1@apillon.io',
          code: correctCode,
          token,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(false);
    });

    test('Fail to validate OTP with used OTP', async () => {
      await stage.db.authentication.paramExecute(
        `UPDATE otp SET used = true WHERE email = '${email}'`,
      );

      const response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email,
          code: correctCode,
          token,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(false);
    });

    test('Fail to validate OTP with expired OTP', async () => {
      await stage.db.authentication.paramExecute(
        `UPDATE otp SET expireTime = NOW() - INTERVAL 1 HOUR WHERE email = '${email}'`,
      );

      const response = await request(stage.http)
        .post('/embedded-wallet/otp/validate')
        .send({
          email,
          code: correctCode,
          token,
        });
      expect(response.status).toBe(200);
      expect(response.body.data).toBe(false);
    });
  });
});
