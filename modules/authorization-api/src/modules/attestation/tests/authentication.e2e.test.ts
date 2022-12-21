import * as request from 'supertest';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';

describe('Authentication tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
    //jest.setTimeout(6000 * 10); // 1 minute
  });

  afterAll(async () => {
    // await releaseStage(stage);
    // jest.setTimeout(5000); // Set timeout back to 5 seconds
  });

  describe('Attestation', () => {
    test('Start attestation process combination ', async () => {
      // const resp = await request(stage.http).post('/attestation/start').send({
      //   email: '',
      // });
      // throw resp;
      // Empty body
      //expect(resp.status).toBe(200);
    });
  });
});
