import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { IdentityState, JwtTokenType } from '../../../config/types';
import { generateJwtToken, SerializeFor } from '@apillon/lib';
import { Identity } from '../models/identity.model';
import { AuthenticationApiContext } from '../../../context';
import * as mock from './mock';

describe('Authentication tests', () => {
  let stage: Stage;
  let context: AuthenticationApiContext;
  jest.setTimeout(6000 * 10); // Set timeout to 1 minute

  // CONTROL PARAMETERS
  const controlMailInvalid = 'INVALIDMAIL';
  const controlMailInvalidDomain = 'test@123@#.www';

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
    context = stage.authApiContext;
  });

  afterAll(async () => {
    await releaseStage(stage);
    jest.setTimeout(5000); // 5 seconds -> revert
  });

  describe('ATTESTATION', () => {
    describe('Init identity generation process', () => {
      test('Empty email', async () => {
        const resp = await request(stage.http).post('/identity/start').send({
          email: '',
        });
        // SUBCASE 1: EMPTY BODY
        expect(resp.status).toBe(422);
        const data1 = JSON.parse(resp.text);
        expect(data1.errors.length).toEqual(1);
        const error1 = data1.errors[0];

        expect(error1.message).toEqual('USER_EMAIL_NOT_PRESENT');
        expect(error1.property).toEqual('email');
        expect(error1.statusCode).toEqual(422070002);
      });

      test('Invalid email', async () => {
        // SUBCASE 2: INVALID EMAIL
        const resp2 = await request(stage.http).post('/identity/start').send({
          email: controlMailInvalid,
        });
        expect(resp2.status).toBe(422);

        const data2 = JSON.parse(resp2.text);
        expect(data2.errors.length).toEqual(1);
        const error2 = data2.errors[0];

        expect(error2.message).toEqual('USER_EMAIL_NOT_VALID');
        expect(error2.property).toEqual('email');
        expect(error2.statusCode).toEqual(422070003);
      });

      test('Invalid email domain', async () => {
        // SUBCASE 3: INVALID MAIL DOMAIN
        const resp3 = await request(stage.http).post('/identity/start').send({
          email: controlMailInvalidDomain,
        });
        expect(resp3.status).toBe(422);

        const data3 = JSON.parse(resp3.text);
        expect(data3.errors.length).toEqual(1);
        const error3 = data3.errors[0];

        expect(error3.message).toEqual('USER_EMAIL_NOT_VALID');
        expect(error3.property).toEqual('email');
        expect(error3.statusCode).toEqual(422070003);
      });

      test('Valid email', async () => {
        // SUBCASE 4: VALID EMAIL
        const resp4 = await request(stage.http).post('/identity/start').send({
          email: 'hello@mailinator.com',
        });
        expect(resp4.status).toBe(201);

        const data4 = JSON.parse(resp4.text);
        expect(data4.errors).toEqual(undefined);
      });

      test('Valid email, but attestation exists', async () => {
        // SUBCASE 5: 1. VALID EMAIL, 2. ATTESTATION EXISTS
        const testEmail = 'test3@mailinator.com';
        const token = generateJwtToken(
          JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
          {
            testEmail,
          },
        );

        // So we make sure the object is commited to the database right away
        const identity = new Identity({}, context);
        identity.populate({
          context: context,
          email: testEmail,
          state: IdentityState.ATTESTED,
          token: token,
          credential: { props: 'I am a credential lalala' },
          status: 5,
        });
        await identity.insert(SerializeFor.INSERT_DB);

        const identityDb = await new Identity({}, context).populateByUserEmail(
          context,
          testEmail,
        );

        expect(identityDb).not.toBeUndefined();
        expect(identityDb.email).toEqual(testEmail);
        expect(identityDb.state).toEqual(IdentityState.ATTESTED);

        const resp5 = await request(stage.http).post('/identity/start').send({
          email: testEmail,
        });
        expect(resp5.status).toBe(201);

        const data5 = JSON.parse(resp5.text);

        // We send no errors, as this is expected behaviour
        expect(data5.errors).toEqual(undefined);
        // Success, however, must be false
        expect(data5.data.success).toBeFalsy();
        expect(data5.data.message).toEqual('Email already attested');
      });
    });

    describe('Test GET identity generation process STATE', () => {
      const testEmail = 'test_state@mailinator.com';

      test('Test INVALID email', async () => {
        const resp = await request(stage.http)
          .get(`/identity/state?email=${controlMailInvalid}`)
          .send();
        expect(resp.status).toBe(422);
      });

      test('Test INVALID email domain', async () => {
        const resp = await request(stage.http)
          .get(`/identity/state?email=${controlMailInvalidDomain}`)
          .send();
        expect(resp.status).toBe(422);
      });

      test('Process not started for email - NO ENTRY IN DB', async () => {
        // STATE --> No entry for this email
        const resp = await request(stage.http)
          .get(`/identity/state?email=${testEmail}`)
          .send();
        expect(resp.status).toBe(400);
      });

      test('Process for email - IN-PROGRESS', async () => {
        // STATE --> in-progress
        const resp1 = await request(stage.http).post('/identity/start').send({
          email: testEmail,
        });
        expect(resp1.status).toBe(201);

        const data4 = JSON.parse(resp1.text);
        expect(data4.errors).toEqual(undefined);

        const resp2 = await request(stage.http)
          .get(`/identity/state?email=${testEmail}`)
          .send();
        expect(resp2.status).toBe(200);

        const data = JSON.parse(resp2.text).data;
        expect(data.state).toEqual('in-progress');

        const identity = await new Identity({}, context).populateByUserEmail(
          context,
          testEmail,
        );

        identity.populate({
          state: 'attested',
        });
        await identity.update();

        const identityDb = await new Identity({}, context).populateByUserEmail(
          context,
          testEmail,
        );

        expect(identityDb).not.toBeUndefined();
        expect(identityDb.email).toEqual(testEmail);
        expect(identityDb.state).toEqual(IdentityState.ATTESTED);
      });

      test('Process is finished for email - ATTESTED', async () => {
        // STATE --> attested
        const resp3 = await request(stage.http)
          .get(`/identity/state?email=${testEmail}`)
          .send();
        expect(resp3.status).toBe(200);

        const data3 = JSON.parse(resp3.text).data;
        expect(data3.state).toEqual('attested');
      });
    });

    describe('Test identity generate endpoint', () => {
      // input parameters combinations (did_create_op, email, didUri), token data combinations
      test('Email combinations', async () => {
        const testEmail = 'test@mailinator.com';
        const token = generateJwtToken(
          JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
          {
            testEmail,
          },
        );

        // So we make sure the object is commited to the database right away
        const identity = new Identity({}, context);
        identity.populate({
          context: context,
          email: testEmail,
          state: IdentityState.IN_PROGRESS,
          token: token,
          credential: { props: 'I am a credential lalala' },
          status: 5,
        });
        await identity.insert(SerializeFor.INSERT_DB);

        const identityDb = await new Identity({}, context).populateByUserEmail(
          context,
          testEmail,
        );

        expect(identityDb).not.toBeUndefined();
        expect(identityDb.email).toEqual(testEmail);
        expect(identityDb.state).toEqual(IdentityState.IN_PROGRESS);

        const resp = await request(stage.http)
          .get(`/identity/state?email=${testEmail}`)
          .send();
        expect(resp.status).toBe(200);
      });
    });
  });
});
