import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { createTestUser, TestUser } from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { UserConsentDto, UserConsentStatus } from '../dtos/user-consent.dto';

describe('User consents tests', () => {
  let stage: Stage;

  let testUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    // insert terms
    const inserts = [
      // Old type 1
      `
      INSERT INTO terms (id, status, title, type, text, validFrom) 
      VALUES (1, 5, 'Test1-t1', 1, 'old terms t1', DATE_ADD(NOW(), INTERVAL -2 DAY));
      `,
      // active type 1
      `
      INSERT INTO terms (id, status, title, type, text, validFrom) 
      VALUES (2, 5, 'Test2-t1', 1, 'active terms t1', DATE_ADD(NOW(), INTERVAL -1 DAY));
      `,
      // active type 2
      `
      INSERT INTO terms (id, status, title, type, url, validFrom) 
      VALUES (3, 5, 'Test-t2', 2, 'https://apillon.io/t2', DATE_ADD(NOW(), INTERVAL -2 DAY));
      `,
      // draft type 2
      `
      INSERT INTO terms (id, status, title, type, url, validFrom) 
      VALUES (4, 1, 'Test-t2', 2, 'https://apillon.io/t2', DATE_ADD(NOW(), INTERVAL -1 DAY));
      `,
      // old type 2
      `
      INSERT INTO terms (id, status, title, type, text, validFrom) 
      VALUES (5, 5, 'Test-t2', 2, 'old type 2', DATE_ADD(NOW(), INTERVAL -3 DAY));
      `,
      // deactivated type 2
      `
       INSERT INTO terms (id, status, title, type, url, validFrom) 
       VALUES (6, 9, 'Test-t2', 2, 'https://apillon.io/t2', DATE_ADD(NOW(), INTERVAL -10 MINUTE));
       `,
      // Active type 3
      `
      INSERT INTO terms (id, status, title, type, text, validFrom, isRequired) 
      VALUES (7, 5, 'Test t3', 3, 'active t3', DATE_ADD(NOW(), INTERVAL -2 DAY), 1);
      `,
    ];

    for (const x of inserts) {
      await stage.configSql.paramExecute(x);
    }
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('API should return active terms', async () => {
    const resp = await request(stage.http)
      .get('/users/terms')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(200);
    expect(resp.body.data.length).toBe(3);
  });

  test('User should be able to decline terms', async () => {
    const data = [];
    data.push(
      new UserConsentDto({
        id: 2,
        type: 1,
        status: UserConsentStatus.DECLINED,
      }),
    );
    const resp = await request(stage.http)
      .post('/users/consents')
      .send(data)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(201);
  });

  test('User should be able to accept terms', async () => {
    const data = [];
    data.push(
      new UserConsentDto({
        id: 3,
        type: 2,
        status: UserConsentStatus.ACCEPTED,
      }),
    );
    const resp = await request(stage.http)
      .post('/users/consents')
      .send(data)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(201);
  });

  test('User should see only unanswered terms', async () => {
    const resp = await request(stage.http)
      .get('/users/terms')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(200);
    expect(resp.body.data.length).toBe(2);
  });

  test('User should see new terms', async () => {
    await stage.configSql.paramExecute(`
      UPDATE terms 
      SET
      status = 5,
      validFrom = NOW()
      WHERE id = 4
    `);
    const resp = await request(stage.http)
      .get('/users/terms')
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(200);
    expect(resp.body.data.length).toBe(3);
  });
  test('User should not be able to decline required terms', async () => {
    const data = [];
    data.push(
      new UserConsentDto({
        id: 2,
        type: 1,
        status: UserConsentStatus.ACCEPTED,
      }),
    );
    data.push(
      new UserConsentDto({
        id: 4,
        type: 2,
        status: UserConsentStatus.ACCEPTED,
      }),
    );
    data.push(
      new UserConsentDto({
        id: 7,
        type: 3,
        status: UserConsentStatus.DECLINED,
      }),
    );
    const resp = await request(stage.http)
      .post('/users/consents')
      .send(data)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(422);
  });

  test('User should accept/decline multiple terms', async () => {
    const data = [];
    data.push(
      new UserConsentDto({
        id: 2,
        type: 1,
        status: UserConsentStatus.ACCEPTED,
      }),
    );
    data.push(
      new UserConsentDto({
        id: 4,
        type: 2,
        status: UserConsentStatus.DECLINED,
      }),
    );
    data.push(
      new UserConsentDto({
        id: 7,
        type: 3,
        status: UserConsentStatus.ACCEPTED,
      }),
    );
    const resp = await request(stage.http)
      .post('/users/consents')
      .send(data)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(resp.status).toBe(201);
  });
});
