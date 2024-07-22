import { Stage, releaseStage } from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

const clearOtps = async (stage: Stage) => {
  await stage.db.authentication.paramExecute(`DELETE FROM otp;`);
};

describe('OTP tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('OTP Generation tests', () => {
    afterAll(async () => {
      await clearOtps(stage);
    });

    test('Successfully create OTP', async () => {
      const email = 'test@apillon.io';
      const response = await request(stage.http).post('/otp').send({
        email: 'test@apillon.io',
      });

      expect(response.status).toBe(201);

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

    test('Successfully validate OTP', async () => {
      const t = await stage.db.authentication.paramExecute(
        `SELECT * FROM otp WHERE email = '${email}'`,
      );

      const response = await request(stage.http).post('/otp/validate').send({
        email,
        code: correctCode,
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toBe(true);

      const dbData = await stage.db.authentication.paramExecute(
        `SELECT * FROM otp WHERE email = '${email}'`,
      );

      expect(dbData).toHaveLength(1);
      const fetchedOtp = dbData[0];
      expect(fetchedOtp.used).toBe(1);
    });

    test('Fail to validate OTP with incorrect code', async () => {
      const response = await request(stage.http).post('/otp/validate').send({
        email,
        code: '1C2B3A',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toBe(false);
    });

    test('Fail to validate OTP with incorrect email', async () => {
      const response = await request(stage.http).post('/otp/validate').send({
        email: 'test-1@apillon.io',
        code: correctCode,
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toBe(false);
    });

    test('Fail to validate OTP with used OTP', async () => {
      await stage.db.authentication.paramExecute(
        `UPDATE otp SET used = true WHERE email = '${email}'`,
      );

      const response = await request(stage.http).post('/otp/validate').send({
        email,
        code: correctCode,
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toBe(false);
    });

    test('Fail to validate OTP with expired OTP', async () => {
      await stage.db.authentication.paramExecute(
        `UPDATE otp SET expireTime = NOW() - INTERVAL 1 HOUR WHERE email = '${email}'`,
      );

      const response = await request(stage.http).post('/otp/validate').send({
        email,
        code: correctCode,
      });
      expect(response.status).toBe(201);
      expect(response.body.data).toBe(false);
    });
  });
});
