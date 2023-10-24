import * as request from 'supertest';
import { generateJwtToken, JwtTokenType, SerializeFor } from '@apillon/lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as mock from './mock-data';
import {
  DidDocument,
  ICredential,
  SignResponseData,
} from '@kiltprotocol/types';
import { Identity } from '@apillon/authentication/src/modules/identity/models/identity.model';
import {
  DbTables,
  IdentityState,
} from '@apillon/authentication/src/config/types';
import {
  generateKeypairs,
  getFullDidDocument,
  createPresentation,
} from './utils';

describe('VERFICATION', () => {
  let stage: Stage;
  let identityToken: string;
  let authSessionToken: string;
  let testEmail: string;

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
    jest.setTimeout(10000); // Set timeout to 10 seconds
  });

  afterAll(async () => {
    jest.setTimeout(5000);
    await releaseStage(stage);
  });

  beforeEach(async () => {
    testEmail = mock.CREATE_IDENTITY_MOCK.email;

    identityToken = generateJwtToken(
      JwtTokenType.IDENTITY_VERIFICATION,
      {
        email: testEmail,
      },
      '1d',
    );

    authSessionToken = generateJwtToken(
      JwtTokenType.AUTH_SESSION,
      {
        email: testEmail,
      },
      '10m',
    );
  });

  afterEach(async () => {
    await stage.authApiContext.mysql.paramExecute(
      `
        DELETE FROM \`${DbTables.IDENTITY}\` i
      `,
    );
  });

  describe('Identity test', () => {
    test('Identity attestation', async () => {
      // IDENTITY 1 - ATTESTED
      const identityAttested = new Identity({}, stage.authApiContext);
      identityAttested.populate({
        context: stage.authApiContext,
        email: testEmail,
        state: IdentityState.ATTESTED,
        identityToken,
        credential: {},
        status: 5,
      });
      await identityAttested.insert(SerializeFor.INSERT_DB);

      const identityAttestedDb = await new Identity(
        {},
        stage.authApiContext,
      ).populateByUserEmail(stage.authApiContext, testEmail);

      expect(identityAttestedDb).not.toBeUndefined();
      expect(identityAttestedDb.email).toEqual(testEmail);
      expect(identityAttestedDb.state).toEqual(IdentityState.ATTESTED);

      const resp1 = await request(stage.http)
        .get(`/identity/state/query?email=${testEmail}`)
        .set('Authorization', `Bearer ${identityToken}`)
        .send();
      expect(resp1.status).toBe(200);

      const data1 = resp1.body.data;
      expect(data1.state).toEqual('attested');
    });
  });

  describe('VERIFICATION', () => {
    test('Test invalid did uri', async () => {
      const credential = mock.CREATE_IDENTITY_MOCK.credential;
      const iCredential = credential as ICredential;
      const keypairs = await generateKeypairs(
        mock.CREATE_IDENTITY_MOCK.mnemonic,
      );
      const didDoc = (await getFullDidDocument(keypairs)) as DidDocument;

      // 1. INVALID DID URI
      const presentation = await createPresentation(
        iCredential,
        async ({ data }) =>
          ({
            signature: keypairs.authentication.sign(data),
            keyType: keypairs.authentication.type,
            keyUri: `${didDoc?.uri}#${didDoc?.authentication[0].id}aasd`,
          } as SignResponseData),
      );

      const resp = await request(stage.http)
        .post('/verification/verify')
        .set('Authorization', `Bearer ${authSessionToken}`)
        .send({
          presentation,
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
      const invalidDidDoc = (await getFullDidDocument(
        invalidKeypairs,
      )) as DidDocument;
      //   const validKeypairs = await generateKeypairs(
      //     mock.CREATE_IDENTITY_MOCK.mnemonic,
      //   );
      //   const validDidDoc = (await getFullDidDocument(
      //     validKeypairs,
      //   )) as DidDocument;

      const presentationInvalid = await createPresentation(
        iCredential,
        async ({ data }) =>
          ({
            signature: invalidKeypairs.authentication.sign(data),
            keyType: invalidKeypairs.authentication.type,
            keyUri: `${invalidDidDoc?.uri}${invalidDidDoc?.authentication[0].id}`,
          } as SignResponseData),
      );

      const resp = await request(stage.http)
        .post('/verification/verify')
        .set('Authorization', `Bearer ${authSessionToken}`)
        .send({ presentation: presentationInvalid });
      expect(resp.status).toBe(201);
      const response = resp.body.data;
      expect(response.verified).toBeFalsy();

      //   expect(response.error).toEqual(
      //     `The DID ${invalidDidDoc.uri} doesnt match the DID Documents URI ${validDidDoc.uri}`,
      //   );
    });

    // test('Test verification successfull', async () => {
    //   const credential = mock.CREATE_IDENTITY_MOCK.credential;
    //   const iCredential = credential as ICredential;
    //   const keypairs = await generateKeypairs(
    //     mock.CREATE_IDENTITY_MOCK.mnemonic,
    //   );
    //   const didDoc = (await getFullDidDocument(keypairs)) as DidDocument;

    //   const presentation = await createPresentation(
    //     iCredential,
    //     async ({ data }) =>
    //       ({
    //         signature: keypairs.authentication.sign(data),
    //         keyType: keypairs.authentication.type,
    //         keyUri: `${didDoc?.uri}${didDoc?.authentication[0].id}`,
    //       } as SignResponseData),
    //   );

    //   const resp = await request(stage.http).post('/verification/verify').send({
    //     presentation: presentation,
    //   });
    //   expect(resp.status).toBe(201);
    //   const response = resp.body.data;
    //   expect(response.verified).toBeTruthy();
    // });
  });
});
