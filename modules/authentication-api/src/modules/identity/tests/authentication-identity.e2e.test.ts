import * as request from 'supertest';
import { Stage, releaseStage } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { JwtTokenType } from '../../../config/types';
import { generateJwtToken, SerializeFor } from '@apillon/lib';
import { AuthenticationApiContext } from '../../../context';
import * as mock from './mock-data';
import { u8aToHex } from '@polkadot/util';
import {
  encryptAsymmetric,
  setupDidCreateMock,
  generateKeypairs,
} from './utils';
import { Identity } from '@apillon/authentication/src/modules/identity/models/identity.model';
import {
  DbTables,
  IdentityState,
} from '@apillon/authentication/src/config/types';

// !!!! NOTE !!!!: Some tests are commented out - Mostly valid ones, because we need a proper
// test environment, which we do not as have as of now. In the future, a test node of the KILT
// network will be deployed (mostly likely a docker container), and the tests
// consolidated then. For now, it enough we know what will NOT WORK or NOT BE ALLOWED for the end-user.

describe('Identity', () => {
  let stage: Stage;
  let context: AuthenticationApiContext;
  jest.setTimeout(100000); // Set timeout to 100 seconds
  const testEmail = 'test@mailinator.com';
  const token = generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
    testEmail,
  });

  // CONTROL PARAMETERS
  const controlMailInvalid = 'INVALIDMAIL';
  const controlMailInvalidDomain = 'test@123@#.www';

  beforeAll(async () => {
    stage = await setupTest();
    context = new AuthenticationApiContext();
  });

  afterAll(async () => {
    jest.setTimeout(5000); // 5 seconds -> revert
    // await releaseStage(stage);
  });

  describe('Test init identity generation process', () => {
    test('Empty email', async () => {
      const resp = await request(stage.http)
        .post('/identity/generate')
        .send({});
      // SUBCASE 1: EMPTY BODY
      expect(resp.status).toBe(422);
      const errors = resp.body.errors;
      expect(errors.length).toEqual(4);

      const errorCodes = errors.map((x) =>
        x.message == 'IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT' ||
        x.message == 'USER_EMAIL_NOT_PRESENT' ||
        x.message == 'DID_URI_NOT_PRESENT' ||
        x.message == 'IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT'
          ? x.message
          : null,
      );
      expect(
        errorCodes.includes('IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT'),
      ).toBeTruthy();
      expect(errorCodes.includes('USER_EMAIL_NOT_PRESENT')).toBeTruthy();
      expect(errorCodes.includes('DID_URI_NOT_PRESENT')).toBeTruthy();
      expect(
        errorCodes.includes('IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT'),
      ).toBeTruthy();
    });

    test('Send verification email invalid cases', async () => {
      const resp = await request(stage.http)
        .post('/identity/verification/email')
        .send({});
      expect(resp.status).toBe(422);
      const errors = resp.body.errors;
      expect(errors.length).toEqual(2);

      const errorCodes = errors.map((x) =>
        x.message == 'USER_EMAIL_NOT_PRESENT' ||
        x.message == 'IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT'
          ? x.message
          : null,
      );
      expect(errorCodes.includes('USER_EMAIL_NOT_PRESENT')).toBeTruthy();
      expect(
        errorCodes.includes('IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT'),
      ).toBeTruthy();
    });

    test('Valid email but attestation exists', async () => {
      const testEmail = 'test3@mailinator.com';

      const identity = new Identity({}, stage.authApiContext);
      identity.populate({
        email: testEmail,
        state: IdentityState.ATTESTED,
        token: token,
        credential: { props: 'I am a credential lalala' },
        status: 5,
      });
      await identity.insert(SerializeFor.INSERT_DB);

      const resp = await request(stage.http)
        .post('/identity/verification/email')
        .send({
          email: testEmail,
          token: token,
          type: 'generate-identity',
        });

      expect(resp.status).toBe(422);
      expect(resp.body.message).toEqual('IDENTITY_CREATE_INVALID_REQUEST');
    });
  });

  describe('Test GET identity generation process STATE', () => {
    test('Test INVALID email', async () => {
      const resp = await request(stage.http)
        .get(`/identity/state/query?email=${controlMailInvalid}&token=${token}`)
        .send();
      expect(resp.status).toBe(422);
    });

    test('Test INVALID email domain', async () => {
      const resp = await request(stage.http)
        .get(`/identity/state/query?email=${controlMailInvalid}&token=${token}`)
        .send();
      expect(resp.status).toBe(422);
    });

    test('Process not started for email - NO ENTRY IN DB', async () => {
      const mail = 'nonexistent@mailinator.com';
      const tokenT = generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
        mail,
      });
      // STATE --> No entry for this email
      const resp = await request(stage.http)
        .get(`/identity/state/query?email=${mail}&token=${tokenT}`)
        .send();
      expect(resp.status).toBe(400);
      expect(resp.body.message).toEqual('IDENTITY_DOES_NOT_EXIST');
    });

    test('Valid email', async () => {
      const testEmail4 = 'test_mail4@mailinator.com';
      const tokenT = generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
        testEmail4,
      });
      const identity = new Identity({}, stage.authApiContext);
      identity.populate({
        email: testEmail4,
        state: IdentityState.IN_PROGRESS,
        token: tokenT,
        status: 5,
      });
      await identity.insert(SerializeFor.INSERT_DB);

      const resp = await request(stage.http)
        .get(`/identity/state/query?email=${testEmail4}&token=${token}`)
        .send();
      expect(resp.status).toBe(200);
      const data = resp.body.data;
      expect(data.state).toEqual('in-progress');
    });
  });

  describe('Test identity generate endpoint', () => {
    const identityMock = mock.CREATE_IDENTITY_MOCK;
    const testEmailAttested = 'attested@mailinator.com';

    beforeEach(async () => {
      const testEmail = identityMock.email;
      // IDENTITY 1 - IN_PROGRESS
      const identity = new Identity({}, stage.authApiContext);
      identity.populate({
        context: stage.authApiContext,
        email: testEmail,
        state: IdentityState.IN_PROGRESS,
        token: identityMock.verification_token,
        credential: {},
        status: 5,
      });
      await identity.insert(SerializeFor.INSERT_DB);
      // Double check
      const identityDb = await new Identity(
        {},
        stage.authApiContext,
      ).populateByUserEmail(stage.authApiContext, testEmail);
      expect(identityDb).not.toBeUndefined();
      expect(identityDb.email).toEqual(testEmail);
      expect(identityDb.state).toEqual(IdentityState.IN_PROGRESS);
      const resp = await request(stage.http)
        .get(`/identity/state/query?email=${testEmail}&token=${token}`)
        .send();
      expect(resp.status).toBe(200);
      const data = resp.body.data;
      expect(data.state).toEqual('in-progress');
      // IDENTITY 2 - ATTESTED
      const identityAttested = new Identity({}, stage.authApiContext);
      identityAttested.populate({
        context: stage.authApiContext,
        email: 'attested@mailinator.com',
        state: IdentityState.ATTESTED,
        token: identityMock.verification_token,
        credential: {},
        status: 5,
      });
      await identityAttested.insert(SerializeFor.INSERT_DB);
      const identityAttestedDb = await new Identity(
        {},
        stage.authApiContext,
      ).populateByUserEmail(stage.authApiContext, testEmailAttested);
      expect(identityAttestedDb).not.toBeUndefined();
      expect(identityAttestedDb.email).toEqual(testEmailAttested);
      expect(identityAttestedDb.state).toEqual(IdentityState.ATTESTED);
      const resp1 = await request(stage.http)
        .get(`/identity/state/query?email=${testEmailAttested}&token=${token}`)
        .send();
      expect(resp1.status).toBe(200);
      const data1 = resp1.body.data;
      expect(data1.state).toEqual('attested');
    });

    afterEach(async () => {
      await stage.authApiContext.mysql.paramExecute(
        `
        DELETE FROM \`${DbTables.IDENTITY}\` i
        `,
      );
    });

    test('Combinatorics - verification token', async () => {
      const mockData = await setupDidCreateMock();
      // This makes a deep-copy: propsB = { ...propsA } (shallow: propsB = PropsA)
      const controlRequestBody = { ...mockData.body_mock };
      // INVALID TOKEN
      controlRequestBody.token = 'INVALID_TOKEN';
      const resp = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });
      expect(resp.body.message).toEqual('IDENTITY_INVALID_VERIFICATION_TOKEN');
      expect(resp.status).toBe(400);
      // EMPTY TOKEN
      controlRequestBody.token = null;
      const resp2 = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });

      const errors2 = resp2.body.errors[0];
      expect(resp2.status).toBe(422);
      expect(errors2.code).toEqual(422070111);
      expect(errors2.message).toEqual(
        'IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT',
      );
      // EXPIRED TOKEN
      controlRequestBody.token = generateJwtToken(
        JwtTokenType.IDENTITY_VERIFICATION,
        {
          email: identityMock.email,
        },
        '0', // valid 0 miliseconds
      );
      const resp3 = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });
      expect(resp3.status).toBe(400);
      expect(resp3.body.message).toEqual('IDENTITY_INVALID_VERIFICATION_TOKEN');
      // NOTE: VALID TOKEN, but we set identity to attested, since
      // we don't want to go through the whole process -> Identity state
      // check is performed after token validation
      controlRequestBody.token = generateJwtToken(
        JwtTokenType.IDENTITY_VERIFICATION,
        {
          email: testEmailAttested,
        },
      );
      controlRequestBody.email = testEmailAttested;
      const resp4 = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });
      expect(resp4.status).toBe(400);
      expect(resp4.body.message).toEqual('IDENTITY_INVALID_STATE');
    });

    test('Combinatorics - didUri', async () => {
      const mockData = await setupDidCreateMock();
      const controlRequestBody = { ...mockData.body_mock };
      // EMPTY DIDURI
      controlRequestBody.didUri = null;
      const resp = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });
      expect(resp.status).toBe(422);
      const data = resp.body;
      expect(data.errors.length).toEqual(1);
      const error = data.errors[0];
      expect(error.code).toEqual(422070200);
      expect(error.message).toEqual('DID_URI_NOT_PRESENT');
      expect(error.property).toEqual('didUri');
      // EMPTY DID 2
      controlRequestBody.didUri = '';
      const resp1 = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });
      expect(resp1.status).toBe(422);
      const data1 = resp1.body;
      expect(data1.errors.length).toEqual(1);
      const error1 = data1.errors[0];
      expect(error1.message).toEqual('DID_URI_NOT_PRESENT');
      expect(error1.property).toEqual('didUri');
      expect(error1.code).toEqual(422070200);
      // INVALID DID
      controlRequestBody.didUri = 'did:klt:123asdasdasd';
      const resp2 = await request(stage.http)
        .post('/identity/generate')
        .send({
          ...controlRequestBody,
        });
      expect(resp2.status).toBe(422);
      const data2 = resp2.body;
      expect(data2.errors.length).toEqual(1);
      const error2 = data2.errors[0];
      expect(error2.message).toEqual('DID_URI_INVALID');
      expect(error2.property).toEqual('didUri');
      expect(error2.code).toEqual(422070201);
    });

    // input parameters combinations (did_create_op, email, didUri), token data combinations
    test('Combinatorics - Email', async () => {
      const mockData = await setupDidCreateMock();
      const controlRequestBody = { ...mockData.body_mock };
      // INVALID EMAIL
      controlRequestBody.email = controlMailInvalid;
      const resp = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...controlRequestBody,
        });
      const error = resp.body.errors[0];
      expect(resp.status).toBe(422);
      expect(error.code).toEqual(422070003);
      expect(error.message).toEqual('USER_EMAIL_NOT_VALID');
      // EMPTY EMAIL
      controlRequestBody.email = '';
      const resp2 = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...controlRequestBody,
        });
      const error2 = resp2.body.errors[0];
      expect(resp2.status).toBe(422);
      expect(error2.message).toEqual('USER_EMAIL_NOT_PRESENT');
      expect(error2.code).toEqual(422070002);
      // ATTESTED EMAIL
      controlRequestBody.email = testEmailAttested;
      // Generate a new token with the correct data
      controlRequestBody.token = generateJwtToken(
        JwtTokenType.IDENTITY_VERIFICATION,
        {
          email: testEmailAttested,
        },
      );
      const resp3 = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...controlRequestBody,
        });
      expect(resp3.status).toBe(400);
      expect(resp3.body.message).toEqual('IDENTITY_INVALID_STATE');
      // VALID EMAIL
      // const resp4 = await request(stage.http)
      //   .post('/identity/generate/identity')
      //   .send({
      //     ...mockData.body_mock,
      //   });
      // expect(resp4.status).toBe(201);
    });

    test('Combinatorics - did_create_op', async () => {
      const mockData = await setupDidCreateMock();
      const controlRequestBody = { ...mockData.body_mock };
      // 1. DID_CREATE_OP is null
      controlRequestBody.did_create_op = null;
      const resp = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...controlRequestBody,
        });
      expect(resp.status).toBe(422);
      expect(resp.body.errors.length).toEqual(1);
      const error1 = resp.body.errors[0];
      expect(error1.message).toEqual(
        'IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT',
      );
      expect(error1.property).toEqual('did_create_op');
      expect(error1.code).toEqual(422070112);
      // 2. DID_CREATE_OP payload nonce is null
      const controlRequestBody2 = { ...mockData.body_mock };
      controlRequestBody2.did_create_op.payload.nonce = null;
      const resp2 = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...controlRequestBody2,
        });
      expect(resp2.status).toEqual(400);
      expect(resp2.body.message).toEqual('IDENTITY_INVALID_REQUEST');
      // 3. DID_CREATE_OP payload message is null
      const controlRequestBody3 = {
        ...mockData.body_mock,
      };
      controlRequestBody3.did_create_op.payload.message = null;
      const resp3 = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...controlRequestBody3,
        });
      expect(resp3.status).toEqual(400);
      expect(resp3.body.message).toEqual('IDENTITY_INVALID_REQUEST');
      // 4. DID_CREATE_OP invalid encryption
      const controlRequestBody4 = { ...mockData };
      const didCreateCall = controlRequestBody4.did_create_call;
      const { keyAgreement } = await generateKeypairs(
        mock.CREATE_IDENTITY_MOCK.mnemonic_control,
      );
      const encryptedData = await encryptAsymmetric(
        JSON.stringify(didCreateCall),
        mock.APILLON_ACC_ENCRYPT_KEY,
        u8aToHex(keyAgreement.secretKey),
      );

      const invalid_did_create_op = {
        payload: {
          message: u8aToHex(encryptedData.box),
          nonce: u8aToHex(encryptedData.nonce),
        },
        senderPubKey: u8aToHex(
          controlRequestBody4.claimer_encryption_key.publicKey,
        ),
      };
      controlRequestBody4.did_create_op = invalid_did_create_op;
      const params = {
        did_create_op: invalid_did_create_op,
        email: mock.CREATE_IDENTITY_MOCK.email,
        didUri: mock.CREATE_IDENTITY_MOCK.did_uri,
        token: generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
          email: mock.CREATE_IDENTITY_MOCK.email,
        }),
      };
      const resp4 = await request(stage.http)
        .post('/identity/generate/identity')
        .send({
          ...params,
        });
      expect(resp4.status).toEqual(400);
      expect(resp3.body.message).toEqual('IDENTITY_INVALID_REQUEST');
      const encryptedData2 = await encryptAsymmetric(
        JSON.stringify(didCreateCall),
        mock.APILLON_ACC_ENCRYPT_KEY,
        u8aToHex(controlRequestBody4.claimer_encryption_key.secretKey),
      );
      // 5. DID_CREATE_OP VALID
      // params.did_create_op = {
      //   payload: {
      //     message: u8aToHex(encryptedData2.box),
      //     nonce: u8aToHex(encryptedData2.nonce),
      //   },
      //   senderPubKey: u8aToHex(
      //     controlRequestBody4.claimer_encryption_key.publicKey,
      //   ),
      // };
      // const resp5 = await request(stage.http)
      //   .post('/identity/generate/identity')
      //   .send({
      //     ...params,
      //   });
      // expect(resp5.status).toEqual(201);
    });

    test('Combinatorics - empty body', async () => {
      const resp = await request(stage.http)
        .post('/identity/generate/identity')
        .send({});
      expect(resp.status).toEqual(422);
      const errors = resp.body.errors;
      expect(errors.length).toBeGreaterThan(0);
      const errorCodes = errors.map((x) =>
        x.message == 'IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT' ||
        x.message == 'USER_EMAIL_NOT_PRESENT' ||
        x.message == 'DID_URI_NOT_PRESENT' ||
        x.message == 'IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT'
          ? x.message
          : null,
      );
      expect(
        errorCodes.includes('IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT'),
      ).toBeTruthy();
      expect(errorCodes.includes('USER_EMAIL_NOT_PRESENT')).toBeTruthy();
      expect(errorCodes.includes('DID_URI_NOT_PRESENT')).toBeTruthy();
      expect(
        errorCodes.includes('IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT'),
      ).toBeTruthy();
    });

    // test('Correct credential structure', async () => {
    //   const mockData = await setupDidCreateMock();
    //   const controlRequestBody = { ...mockData.body_mock };
    //   controlRequestBody.token = generateJwtToken(
    //     JwtTokenType.IDENTITY_VERIFICATION,
    //     {
    //       email: identityMock.email,
    //     },
    //     '1d', // valid 0 miliseconds
    //   );
    //   // VALID EMAIL
    //   const resp = await request(stage.http)
    //     .post('/identity/generate/identity')
    //     .send({
    //       ...controlRequestBody,
    //     });

    //   expect(resp.status).toBe(201);
    // });
  });
});
