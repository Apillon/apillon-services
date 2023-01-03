import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';

/*
"errors": Array [
  Object {
    "message": "USER_EMAIL_NOT_PRESENT",
    "property": "email",
    "statusCode": 422070002,
  },
],
*/

describe('Authentication tests', () => {
  let stage: Stage;
  jest.setTimeout(6000 * 10); // 1 minute

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Attestation', () => {
    test('ATTESTATION | Exec start identity generation process', async () => {
      const resp = await request(stage.http).post('/identity/start').send({
        email: '',
      });
      // Empty body
      expect(resp.status).toBe(422);
      const data1 = JSON.parse(resp.text);
      expect(data1.errors.length).toEqual(1);
      const error1 = data1.errors[0];

      expect(error1.message).toEqual('USER_EMAIL_NOT_PRESENT');
      expect(error1.property).toEqual('email');
      expect(error1.statusCode).toEqual(422070002);

      const resp2 = await request(stage.http).post('/identity/start').send({
        email: 'INVALID_EMAIL',
      });
      expect(resp2.status).toBe(422);

      const data2 = JSON.parse(resp2.text);
      expect(data2.errors.length).toEqual(1);
      const error2 = data2.errors[0];

      expect(error2.message).toEqual('USER_EMAIL_NOT_VALID');
      expect(error2.property).toEqual('email');
      expect(error2.statusCode).toEqual(422070003);

      const resp3 = await request(stage.http).post('/identity/start').send({
        email: 'test@mailinator.com',
      });
      expect(resp3.status).toBe(201);

      const data3 = JSON.parse(resp3.text);
      expect(data3.errors).toEqual(undefined);
    });
  });
});
