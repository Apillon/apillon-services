import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { DbTables, IdentityState, JwtTokenType } from '../../../config/types';
import { generateJwtToken, SerializeFor, SqlModelStatus } from '@apillon/lib';
import { Identity } from '../models/identity.model';
import { AuthenticationApiContext } from '../../../context';
import * as mock from './mock';
import { Utils } from '@kiltprotocol/sdk-js';
import { generateKeypairs } from '../../../lib/kilt';
import { u8aToHex } from '@polkadot/util';

const setupDidCreateMock = async () => {
  const identityMock = mock.CREATE_IDENTITY_MOCK;
  const didMock = identityMock.did_create_op_data;
  const { encryption } = await generateKeypairs(identityMock.mnemonic);

  const did_create_call = {
    data: didMock.encoded_data,
    signature: didMock.encoded_data,
  };

  const encryptedData = Utils.Crypto.encryptAsymmetric(
    JSON.stringify(did_create_call),
    mock.APILLON_ACC_ENCRYPT_KEY,
    u8aToHex(encryption.secretKey),
  );

  const did_create_op = {
    payload: {
      message: u8aToHex(encryptedData.box),
      nonce: u8aToHex(encryptedData.nonce),
    },
    senderPubKey: u8aToHex(encryption.publicKey),
  };

  const bodyMock = {
    email: identityMock.email,
    didUri: identityMock.did_uri,
    did_create_op: did_create_op,
    token: generateJwtToken(JwtTokenType.IDENTITY_EMAIL_VERIFICATION, {
      email: identityMock.email,
    }),
  };

  return {
    did_create_call: did_create_call,
    encrypted_data: encryptedData,
    did_create_op: did_create_op,
    claimer_encryption_key: encryption,
    body_mock: bodyMock,
  };
};

describe('Authentication tests', () => {
  let stage: Stage;
  let context: AuthenticationApiContext;
  jest.setTimeout(100000); // Set timeout to 100 seconds

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
        const data1 = resp.body;
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
        const resp = await request(stage.http).post('/identity/start').send({
          email: controlMailInvalidDomain,
        });
        expect(resp.status).toBe(422);

        const data = resp.body;
        expect(data.errors.length).toEqual(1);
        const error = data.errors[0];

        expect(error.message).toEqual('USER_EMAIL_NOT_VALID');
        expect(error.property).toEqual('email');
        expect(error.statusCode).toEqual(422070003);
      });

      test('Valid email', async () => {
        // SUBCASE 4: VALID EMAIL
        const resp = await request(stage.http).post('/identity/start').send({
          email: 'hello@mailinator.com',
        });
        expect(resp.status).toBe(201);

        const data = resp.body;
        expect(data.errors).toEqual(undefined);
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

        const resp = await request(stage.http).post('/identity/start').send({
          email: testEmail,
        });
        expect(resp.status).toBe(201);

        const data = resp.body;

        // We send no errors, as this is expected behaviour
        expect(data.errors).toEqual(undefined);
        // Success, however, must be false
        expect(data.data.success).toBeFalsy();
        expect(data.data.message).toEqual('Email already attested');
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
        const resp = await request(stage.http).post('/identity/start').send({
          email: testEmail,
        });
        expect(resp.status).toBe(201);

        const data = resp.body;
        expect(data.errors).toEqual(undefined);

        const resp1 = await request(stage.http)
          .get(`/identity/state?email=${testEmail}`)
          .send();
        expect(resp1.status).toBe(200);

        const data1 = resp1.body.data;
        expect(data1.state).toEqual('in-progress');

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
        const resp = await request(stage.http)
          .get(`/identity/state?email=${testEmail}`)
          .send();
        expect(resp.status).toBe(200);

        const data = resp.body.data;
        expect(data.state).toEqual('attested');
      });
    });

    describe('Test identity generate endpoint', () => {
      const identityMock = mock.CREATE_IDENTITY_MOCK;
      const testEmailAttested = 'attested@mailinator.com';

      beforeEach(async () => {
        const testEmail = identityMock.email;

        // IDENTITY 1 - IN_PROGRESS
        const identity = new Identity({}, context);
        identity.populate({
          context: context,
          email: testEmail,
          state: IdentityState.IN_PROGRESS,
          token: identityMock.verification_token,
          credential: {},
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

        const data = resp.body.data;
        expect(data.state).toEqual('in-progress');

        // IDENTITY 2 - ATTESTED
        const identityAttested = new Identity({}, context);
        identityAttested.populate({
          context: context,
          email: 'attested@mailinator.com',
          state: IdentityState.ATTESTED,
          token: identityMock.verification_token,
          credential: {},
          status: 5,
        });
        await identityAttested.insert(SerializeFor.INSERT_DB);

        const identityAttestedDb = await new Identity(
          {},
          context,
        ).populateByUserEmail(context, testEmailAttested);

        expect(identityAttestedDb).not.toBeUndefined();
        expect(identityAttestedDb.email).toEqual(testEmailAttested);
        expect(identityAttestedDb.state).toEqual(IdentityState.ATTESTED);

        const resp1 = await request(stage.http)
          .get(`/identity/state?email=${testEmailAttested}`)
          .send();
        expect(resp1.status).toBe(200);

        const data1 = resp1.body.data;
        expect(data1.state).toEqual('attested');
      });

      afterEach(async () => {
        const data = await context.mysql.paramExecute(
          `
          SELECT *
          FROM \`${DbTables.IDENTITY}\` i
        `,
        );

        const conn = await context.mysql.start();
        for (const identity in data) {
          const deleteIdentity = async () => {
            const i = await new Identity({}, context).populateById(
              data[identity].id,
            );
            await i.delete(conn);
          };

          await deleteIdentity();
        }

        try {
          await context.mysql.commit(conn);
        } catch (error) {
          await context.mysql.rollback(conn);
          throw error;
        }
      });

      test('Combinatorics - verification token', async () => {
        const mockData = await setupDidCreateMock();
        // This makes a deep-copy: propsB = { ...propsA } (shallow: propsB = PropsA)
        const controlRequestBody = { ...mockData.body_mock };

        // INVALID TOKEN
        controlRequestBody.token = 'INVALID_TOKEN';
        const resp1 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody,
          });

        expect(resp1.body.message).toEqual(
          'IDENTITY_INVALID_VERIFICATION_TOKEN',
        );
        expect(resp1.status).toBe(400);

        // EMPTY TOKEN
        controlRequestBody.token = null;
        const resp2 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody,
          });

        const errors2 = resp2.body.errors[0];
        expect(resp2.status).toBe(422);

        expect(errors2.message).toEqual(
          'IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT',
        );
        expect(errors2.statusCode).toEqual(422070110);

        // EXPIRED TOKEN
        controlRequestBody.token = generateJwtToken(
          JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
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
        expect(resp3.body.message).toEqual(
          'IDENTITY_INVALID_VERIFICATION_TOKEN',
        );

        // NOTE: VALID TOKEN, but we set identity to attested, since
        // we don't want to go through the whole process -> Identity state
        // check is performed after token validation
        controlRequestBody.token = generateJwtToken(
          JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
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

        expect(resp4.body.message).toEqual('IDENTITY_INVALID_STATE');
        expect(resp4.status).toBe(400);
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

        expect(error.message).toEqual('DID_URI_NOT_PRESENT');
        expect(error.property).toEqual('didUri');
        expect(error.statusCode).toEqual(422070200);

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
        expect(error1.statusCode).toEqual(422070200);

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
        expect(error2.statusCode).toEqual(422070201);
      });

      // input parameters combinations (did_create_op, email, didUri), token data combinations
      test('Combinatorics - Email', async () => {
        const mockData = await setupDidCreateMock();
        const controlRequestBody = { ...mockData.body_mock };

        // INVALID EMAIL
        controlRequestBody.email = controlMailInvalid;
        const resp = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody,
          });

        const error = resp.body.errors[0];

        expect(resp.status).toBe(422);
        expect(error.statusCode).toEqual(422070003);
        expect(error.message).toEqual('USER_EMAIL_NOT_VALID');

        // EMPTY EMAIL
        controlRequestBody.email = '';
        const resp2 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody,
          });

        const error2 = resp2.body.errors[0];

        expect(resp2.status).toBe(422);
        expect(error2.statusCode).toEqual(422070002);
        expect(error2.message).toEqual('USER_EMAIL_NOT_PRESENT');

        // ATTESTED EMAIL
        controlRequestBody.email = testEmailAttested;
        // Generate a new token with the correct data
        controlRequestBody.token = generateJwtToken(
          JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
          {
            email: testEmailAttested,
          },
        );
        const resp3 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody,
          });

        expect(resp3.status).toBe(400);
        expect(resp3.body.message).toEqual('IDENTITY_INVALID_STATE');

        // VALID EMAIL
        const resp4 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...mockData.body_mock,
          });
        expect(resp4.status).toBe(201);
      });

      test('Combinatorics - did_create_op', async () => {
        const mockData = await setupDidCreateMock();
        const controlRequestBody = { ...mockData.body_mock };

        // 1. DID_CREATE_OP is null
        controlRequestBody.did_create_op = null;
        const resp = await request(stage.http)
          .post('/identity/generate')
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
        expect(error1.statusCode).toEqual(422070112);

        // 2. DID_CREATE_OP payload nonce is null
        const controlRequestBody2 = { ...mockData.body_mock };
        controlRequestBody2.did_create_op.payload.nonce = null;
        const resp2 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody2,
          });

        expect(resp2.body.message).toEqual('bad nonce size');
        expect(resp2.status).toEqual(500);

        // 3. DID_CREATE_OP payload message is null
        const controlRequestBody3 = {
          ...mockData.body_mock,
        };
        controlRequestBody3.did_create_op.payload.message = null;
        const resp3 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...controlRequestBody3,
          });

        expect(resp3.body.message).toEqual('bad nonce size');
        expect(resp3.status).toEqual(500);

        // 4. DID_CREATE_OP invalid encryption
        const controlRequestBody4 = { ...mockData };
        const didCreateCall = controlRequestBody4.did_create_call;
        const { encryption } = await generateKeypairs(
          mock.CREATE_IDENTITY_MOCK.mnemonic_control,
        );

        const encryptedData = Utils.Crypto.encryptAsymmetric(
          JSON.stringify(didCreateCall),
          mock.APILLON_ACC_ENCRYPT_KEY,
          u8aToHex(encryption.secretKey),
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
          token: generateJwtToken(JwtTokenType.IDENTITY_EMAIL_VERIFICATION, {
            email: mock.CREATE_IDENTITY_MOCK.email,
          }),
        };

        const resp4 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...params,
          });
        expect(resp4.body.message).toEqual('Decryption failed ...');
        expect(resp4.status).toEqual(500);

        const encryptedData2 = Utils.Crypto.encryptAsymmetric(
          JSON.stringify(didCreateCall),
          mock.APILLON_ACC_ENCRYPT_KEY,
          u8aToHex(controlRequestBody4.claimer_encryption_key.secretKey),
        );

        // 5. DID_CREATE_OP VALID
        params.did_create_op = {
          payload: {
            message: u8aToHex(encryptedData2.box),
            nonce: u8aToHex(encryptedData2.nonce),
          },
          senderPubKey: u8aToHex(
            controlRequestBody4.claimer_encryption_key.publicKey,
          ),
        };

        const resp5 = await request(stage.http)
          .post('/identity/generate')
          .send({
            ...params,
          });
        expect(resp5.status).toEqual(201);
      });
    });
  });
});
