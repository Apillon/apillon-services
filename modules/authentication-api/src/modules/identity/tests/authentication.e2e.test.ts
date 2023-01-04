import * as request from 'supertest';
import {
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { IdentityState, JwtTokenType } from '../../../config/types';
import { generateJwtToken, SerializeFor } from '@apillon/lib';
import { Identity } from '../models/identity.model';
import { AuthenticationApiContext } from '../../../context';

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
  let context: AuthenticationApiContext;
  jest.setTimeout(6000 * 10); // Set timeout to 1 minute

  const controlMailInvalid = 'INVALIDMAIL';
  const controlMailInvalidDomain = 'test@123@#.www';

  let testUser: TestUser;
  let testUser2: TestUser;

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
    context = stage.authApiContext;
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
    jest.setTimeout(5000); // 5 seconds -> revert
  });

  // Attestation:
  // - startUserAttestationProcess
  //   -> email combinations (valid, invalid, empty, existing)
  //   -> expects a mail sent to address (Not sure how we can check that)
  // - getUserAttestationState
  //   -> email combinations
  // - generateIdentity
  //   -> input parameters combinations (did_create_op, email, didUri), token data combinations
  // - getUserCredential
  //   -> email combinations (valid, empty, existing, non-existing)
  // Verification:
  // - verifyIdentity

  describe('ATTESTATION', () => {
    test('Test init of identity generation process', async () => {
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

      // SUBCASE 4: VALID EMAIL
      const resp4 = await request(stage.http).post('/identity/start').send({
        email: 'hello@mailinator.com',
      });
      expect(resp4.status).toBe(201);

      const data4 = JSON.parse(resp4.text);
      expect(data4.errors).toEqual(undefined);

      // SUBCASE 5: 1. VALID EMAIL, 2. ATTESTATION EXISTS
      const testEmail = 'test3@mailinator.com';
      const token = generateJwtToken(JwtTokenType.IDENTITY_EMAIL_VERIFICATION, {
        testEmail,
      });

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

    test('Test identity get state endpoint', async () => {
      // const testUserMail = testUser.user.email;
      // // VALID EMAIL
      // const resp = await request(stage.http).post('/identity/start').send({
      //   email: testUserMail,
      // });
      // expect(resp.status).toBe(201);
      // const data = JSON.parse(resp.text);
      // expect(data.errors).toEqual(undefined);
      // const error = data.errors[0];
      // expect(error.message).toEqual('USER_EMAIL_NOT_VALID');
      // expect(error.property).toEqual('email');
      // expect(error.statusCode).toEqual(422070003);
      // const response = await request(stage.http).get('/identity/state').send({
      //   email: '',
      // });
      // // Empty body
      // expect(resp.status).toBe(422);
      // const data1 = JSON.parse(resp.text);
      // expect(data1.errors.length).toEqual(1);
      // const error1 = data1.errors[0];
      // expect(error1.message).toEqual('USER_EMAIL_NOT_PRESENT');
      // expect(error1.property).toEqual('email');
      // expect(error1.statusCode).toEqual(422070002);
      // // INVALID EMAIL
      // const resp2 = await request(stage.http).get('/identity/state').send({
      //   email: controlMailInvalid,
      // });
      // expect(resp2.status).toBe(422);
      // const data2 = JSON.parse(resp2.text);
      // expect(data2.errors.length).toEqual(1);
      // const error2 = data2.errors[0];
      // expect(error2.message).toEqual('USER_EMAIL_NOT_VALID');
      // expect(error2.property).toEqual('email');
      // expect(error2.statusCode).toEqual(422070003);
      // // INVALID MAIL DOMAIN
      // const resp3 = await request(stage.http).get('/identity/state').send({
      //   email: controlMailInvalidDomain,
      // });
      // expect(resp3.status).toBe(422);
      // const data3 = JSON.parse(resp3.text);
      // expect(data3.errors.length).toEqual(1);
      // const error3 = data3.errors[0];
      // expect(error3.message).toEqual('USER_EMAIL_NOT_VALID');
      // expect(error3.property).toEqual('email');
      // expect(error3.statusCode).toEqual(422070003);
      // // VALID EMAIL
      // const resp4 = await request(stage.http).get('/identity/state').send({
      //   email: 'test@mailinator.com',
      // });
      // expect(resp4.status).toBe(201);
      // const data4 = JSON.parse(resp4.text);
      // expect(data4.errors).toEqual(undefined);
      // const error4 = data3.errors[0];
      // expect(error4.message).toEqual('USER_EMAIL_NOT_VALID');
      // expect(error4.property).toEqual('email');
      // expect(error4.statusCode).toEqual(422070003);
    });
  });
});
