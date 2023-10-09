import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { Project } from '../../project/models/project.model';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';
import { SqlModelStatus } from '@apillon/lib';

describe('Payments controller e2e tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();

    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Payments session tests', () => {
    test('Create credit session url success', async () => {
      const response = await request(stage.http)
        .get(
          `/payments/stripe/credit-session-url?project_uuid=${testProject.project_uuid}&package_id=1&returnUrl=https://apillon.io`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(typeof response.body.data).toBe('string'); // session URL response
    });

    test('Create credit session url failure', async () => {
      let response = await request(stage.http)
        .get(`/payments/stripe/credit-session-url`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
      expect(response.body.errors.map((e) => e.message)).toContain(
        'PROJECT_UUID_NOT_PRESENT',
      );
      expect(response.body.errors.map((e) => e.message)).toContain(
        'PACKAGE_ID_NOT_PRESENT',
      );

      response = await request(stage.http)
        .get(
          `/payments/stripe/credit-session-url?project_uuid=${testProject.project_uuid}&package_id=10&returnUrl=https://apillon.io`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(500); // package_id not found
      expect(response.body.message).toEqual('STRIPE_ID_NOT_VALID');
    });

    test('Create subscription session url success', async () => {
      const response = await request(stage.http)
        .get(
          `/payments/stripe/subscription-session-url?project_uuid=${testProject.project_uuid}&package_id=2&returnUrl=https://apillon.io`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(typeof response.body.data).toBe('string'); // session URL response
    });

    test('Create subscription session url failure', async () => {
      let response = await request(stage.http)
        .get(`/payments/stripe/subscription-session-url`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
      expect(response.body.errors.map((e) => e.message)).toContain(
        'PROJECT_UUID_NOT_PRESENT',
      );
      expect(response.body.errors.map((e) => e.message)).toContain(
        'PACKAGE_ID_NOT_PRESENT',
      );

      response = await request(stage.http)
        .get(
          `/payments/stripe/subscription-session-url?project_uuid=${testProject.project_uuid}&package_id=10&returnUrl=https://apillon.io`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(500); // package_id not found
      expect(response.body.message).toEqual('STRIPE_ID_NOT_VALID');
    });

    test('Stripe webhook call should fail', async () => {
      const response = await request(stage.http)
        .post('/payments/stripe/webhook')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    test('Get all credit packages', async () => {
      const creditPackages = await stage.configContext.mysql.paramExecute(
        `SELECT * from creditPackage WHERE status = ${SqlModelStatus.ACTIVE}`,
      );
      expect(creditPackages.length).toBeGreaterThanOrEqual(3); // From seed
      const response = await request(stage.http)
        .get('/payments/credit-packages')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const responsePackages = response.body.data;
      expect(creditPackages.length).toEqual(responsePackages.length);
      creditPackages.forEach((creditPackage) => {
        expect(responsePackages.map((r) => r.name)).toContain(
          creditPackage.name,
        );
      });
    });

    test('Get all subscription packages', async () => {
      const subscriptionPackages = await stage.configContext.mysql.paramExecute(
        `SELECT * from subscriptionPackage`,
      );
      expect(subscriptionPackages).toHaveLength(4); // From seed
      const response = await request(stage.http)
        .get('/payments/subscription-packages')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const responsePackages = response.body.data;
      expect(subscriptionPackages.length).toEqual(responsePackages.length);
      subscriptionPackages.forEach((subPackage) => {
        expect(responsePackages.map((r) => r.name)).toContain(subPackage.name);
        expect(responsePackages.map((r) => r.creditAmount)).toContain(
          subPackage.creditAmount,
        );
      });
    });
  });
});
