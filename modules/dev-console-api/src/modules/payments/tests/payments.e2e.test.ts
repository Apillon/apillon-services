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
import { ProductCategory, ProductService, SqlModelStatus } from '@apillon/lib';

/*
 * NOTE: These tests require the following env variables to be filled:
 * STRIPE_WEBHOOK_SECRET
 * STRIPE_SECRET_TEST
 * MAILERLITE_API_KEY
 * POLKADOT_RPC_URL
 * NOWPAYMENTS_API_KEY
 * IPN_SECRET_KEY
 * IPN_CALLBACK_URL
 */
describe('Payments controller e2e tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
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

    test('Create crypto credit session url success', async () => {
      const response = await request(stage.http)
        .post('/payments/crypto/payment')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          project_uuid: testProject.project_uuid,
          package_id: 1,
          returnUrl: 'https://apillon.io',
        });
      expect(response.status).toBe(201);
      expect(typeof response.body.data.invoice_url).toBe('string'); // session URL response
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
  });

  describe('Credit and subscription packages tests', () => {
    test('Get all credit packages', async () => {
      const creditPackages = await stage.context.config.mysql.paramExecute(
        `SELECT * from creditPackage WHERE status = ${SqlModelStatus.ACTIVE}`,
      );
      expect(creditPackages.length).toBeGreaterThanOrEqual(3); // From seed
      const response = await request(stage.http)
        .get('/payments/credit/packages')
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
      const subscriptionPackages =
        await stage.context.config.mysql.paramExecute(
          `SELECT *
           from subscriptionPackage`,
        );
      expect(subscriptionPackages).toHaveLength(4); // From seed
      const response = await request(stage.http)
        .get('/payments/subscription/packages')
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

  describe('Product pricelist tests', () => {
    test('Get all product prices', async () => {
      const response = await request(stage.http)
        .get('/payments/products/price-list')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const products = response.body.data.items;
      expect(products.length).toBeGreaterThanOrEqual(20); // From seed
      products.forEach((item) => {
        expect(item.name).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.service).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.currentPrice).toBeGreaterThanOrEqual(0);
      });
    });

    test('Get filtered product pricelist', async () => {
      let response = await request(stage.http)
        .get(`/payments/products/price-list?service=${ProductService.NFT}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      let products = response.body.data.items;

      expect(products.length).toBeLessThan(20);
      products.forEach((item) => {
        expect(item.service).toBe(ProductService.NFT);
      });

      response = await request(stage.http)
        .get(
          `/payments/products/price-list?category=${ProductCategory.WEBSITE}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      products = response.body.data.items;

      expect(products.length).toBeLessThan(20);
      products.forEach((item) => {
        expect(item.category).toBe(ProductCategory.WEBSITE);
      });
    });

    test('Get a single product', async () => {
      const response = await request(stage.http)
        .get(`/payments/products/1/price`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const product = response.body.data;
      expect(product.name).toBeTruthy();
      expect(product.description).toBeTruthy();
      expect(product.service).toBe(ProductService.HOSTING);
      expect(product.category).toBe(ProductCategory.WEBSITE);
      expect(product.currentPrice).toBeGreaterThanOrEqual(100);
    });

    test('Throw error when product not found', async () => {
      const response = await request(stage.http)
        .get(`/payments/product/1612`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
    });
  });
});
