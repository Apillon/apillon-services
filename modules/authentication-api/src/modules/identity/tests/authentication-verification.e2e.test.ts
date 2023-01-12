import * as request from 'supertest';
import { generateJwtToken, SerializeFor } from '@apillon/lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { DbTables, IdentityState, JwtTokenType } from '../../../config/types';
import { AuthenticationApiContext } from '../../../context';
import { Identity } from '../models/identity.model';
import * as mock from './mock-data';
import {
  DidDocument,
  ICredential,
  SignResponseData,
} from '@kiltprotocol/types';
import { generateKeypairs } from '../../../lib/kilt';
import { getDidDocument, createPresentation } from './utils';

describe('VERFICATION', () => {
  let stage: Stage;
  let context: AuthenticationApiContext;
  const challenge =
    '0x3ce56bb25ea3b603f968c302578e77e28d3d7ba3c7a8c45d6ebd3f410da766e1';

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
    context = stage.authApiContext;
    jest.setTimeout(10000); // Set timeout to 10 seconds
  });

  afterAll(async () => {
    await releaseStage(stage);
    jest.setTimeout(5000);
  });

  beforeEach(async () => {
    const testEmail = mock.CREATE_IDENTITY_MOCK.email;

    const token = generateJwtToken(
      JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
      {
        email: testEmail,
      },
      '1d',
    );

    // IDENTITY 1 - ATTESTED
    const identityAttested = new Identity({}, context);
    identityAttested.populate({
      context: context,
      email: testEmail,
      state: IdentityState.ATTESTED,
      token: token,
      credential: {},
      status: 5,
    });
    await identityAttested.insert(SerializeFor.INSERT_DB);

    const identityAttestedDb = await new Identity(
      {},
      context,
    ).populateByUserEmail(context, testEmail);

    expect(identityAttestedDb).not.toBeUndefined();
    expect(identityAttestedDb.email).toEqual(testEmail);
    expect(identityAttestedDb.state).toEqual(IdentityState.ATTESTED);

    const resp1 = await request(stage.http)
      .get(`/identity/state?email=${testEmail}`)
      .send();
    expect(resp1.status).toBe(200);

    const data1 = resp1.body.data;
    expect(data1.state).toEqual('attested');
  });

  afterEach(async () => {
    await context.mysql.paramExecute(
      `
        DELETE FROM \`${DbTables.IDENTITY}\` i
      `,
    );
  });

  describe('VERIFICATION', () => {
    test('Test invalid did uri', async () => {
      const credential = mock.CREATE_IDENTITY_MOCK.credential;
      const iCredential = credential as ICredential;
      const { authentication } = await generateKeypairs(
        mock.CREATE_IDENTITY_MOCK.mnemonic,
      );
      const didDoc = (await getDidDocument(
        mock.CREATE_IDENTITY_MOCK.mnemonic,
      )) as DidDocument;

      // 1. INVALID DID URI
      const presentation = await createPresentation(
        iCredential,
        async ({ data }) =>
          ({
            signature: authentication.sign(data),
            keyType: authentication.type,
            keyUri: `${didDoc?.uri}#${didDoc?.authentication[0].id}aasd`,
          } as SignResponseData),
        challenge,
      );

      const resp = await request(stage.http).post('/verification/verify').send({
        presentation: presentation,
      });
      expect(resp.status).toBe(201);
      const response = resp.body.data;
      expect(response.verified).toBeFalsy();
      expect(response.error.startsWith('Not a valid KILT DID'));
    });

    test('Test invalid did document', async () => {
      const credential = mock.CREATE_IDENTITY_MOCK.credential;
      const iCredential = credential as ICredential;

      const invalidKeypairs = await generateKeypairs(
        mock.CREATE_IDENTITY_MOCK.mnemonic_control,
      );
      const invalidDidDoc = (await getDidDocument(
        mock.CREATE_IDENTITY_MOCK.mnemonic_control,
      )) as DidDocument;
      const validDidDoc = (await getDidDocument(
        mock.CREATE_IDENTITY_MOCK.mnemonic,
      )) as DidDocument;

      const presentationInvalid = await createPresentation(
        iCredential,
        async ({ data }) =>
          ({
            signature: invalidKeypairs.authentication.sign(data),
            keyType: invalidKeypairs.authentication.type,
            keyUri: `${invalidDidDoc?.uri}${invalidDidDoc?.authentication[0].id}`,
          } as SignResponseData),
        challenge,
      );

      const resp = await request(stage.http).post('/verification/verify').send({
        presentation: presentationInvalid,
      });
      expect(resp.status).toBe(201);
      const response = resp.body.data;
      expect(response.verified).toBeFalsy();

      expect(response.error).toEqual(
        `The DID ${invalidDidDoc.uri} doesnt match the DID Documents URI ${validDidDoc.uri}`,
      );
    });

    test('Test verification successfull', async () => {
      const credential = mock.CREATE_IDENTITY_MOCK.credential;
      const iCredential = credential as ICredential;
      const { authentication } = await generateKeypairs(
        mock.CREATE_IDENTITY_MOCK.mnemonic,
      );
      const didDoc = (await getDidDocument(
        mock.CREATE_IDENTITY_MOCK.mnemonic,
      )) as DidDocument;

      const presentation = await createPresentation(
        iCredential,
        async ({ data }) =>
          ({
            signature: authentication.sign(data),
            keyType: authentication.type,
            keyUri: `${didDoc?.uri}${didDoc?.authentication[0].id}`,
          } as SignResponseData),
        challenge,
      );

      const resp = await request(stage.http).post('/verification/verify').send({
        presentation: presentation,
      });
      expect(resp.status).toBe(201);
      const response = resp.body.data;
      expect(response.verified).toBeTruthy();
    });
  });
});
