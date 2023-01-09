import { SerializeFor } from '@apillon/lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { request } from 'express';
import { setupTest } from '../../../../test/helpers/setup';
import { DbTables, IdentityState } from '../../../config/types';
import { AuthenticationApiContext } from '../../../context';
import { Identity } from '../models/identity.model';

describe('VERFICATION', () => {
  let stage: Stage;
  let context: AuthenticationApiContext;

  beforeAll(async () => {
    console.log('Setup stage ...');
    stage = await setupTest();
    context = stage.authApiContext;
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

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
      await (async () => {
        const i = await new Identity({}, context).populateById(
          data[identity].id,
        );
        await i.delete(conn);
      })();
    }

    try {
      await context.mysql.commit(conn);
    } catch (error) {
      await context.mysql.rollback(conn);
      throw error;
    }
  });

  describe('Test verification', () => {});
});
