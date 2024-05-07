import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
import {
  BucketWebhookAuthMethod,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { BucketWebhook } from '@apillon/storage/src/modules/bucket/models/bucket-webhook.model';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import {
  createTestBucket,
  createTestBucketWebhook,
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { Project } from '../../../project/models/project.model';
import { setupTest } from '../../../../../test/helpers/setup';

describe('Storage bucket tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;
  // let testProject2: Project;

  let testBucket: Bucket;
  let testWebhook: BucketWebhook;

  let testBucket2: Bucket;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );

    testProject = await createTestProject(testUser, stage);
    // testProject2 = await createTestProject(testUser2, stage.context.devConsole);

    testBucket = await createTestBucket(
      testUser,
      stage.context.storage,
      testProject,
    );
    testWebhook = await createTestBucketWebhook(
      stage.context.storage,
      testBucket,
    );

    testBucket2 = await createTestBucket(
      testUser,
      stage.context.storage,
      testProject,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Bucket webhook CRUD tests', () => {
    test('User should be able to get bucket webhook', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.bucket_uuid}/webhook`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.url).toBeTruthy();
    });

    test('User should recieve unprocessable entity error if CREATE webhook request is missing required data', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket2.id}/webhook`)
        .send({})
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should NOT be able to create 2 webhooks in one bucket', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.bucket_uuid}/webhook`)
        .send({
          url: 'https://eob0hpm13hsj7sk.m.pipedream.net',
          authMethod: 'bearerToken',
          param1:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3V1aWQiOiIwMGYxNDdkZC1iNTAyLTQwZDQtYWJlYi1jNGVkNzNjN2I3ODMiLCJpYXQiOjE2NzAxNzQ3MDQsImV4cCI6MTY3MDI2MTEwNCwic3ViIjoiVVNFUl9BVVRIRU5USUNBVElPTiJ9.nZo3dD9YY_bjxyxmL0TBlQi5ckjXjU5m-9bf0ZCDvtY',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(409);
      expect(response.body.code).toBe(
        StorageErrorCode.WEBHOOK_ALREADY_EXISTS_FOR_PROJECT,
      );
    });

    test('User should be able to create bucket webhook', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket2.bucket_uuid}/webhook`)
        .send({
          url: 'https://eob0hpm13hsj7sk.m.pipedream.net',
          authMethod: 'bearerToken',
          param1:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3V1aWQiOiIwMGYxNDdkZC1iNTAyLTQwZDQtYWJlYi1jNGVkNzNjN2I3ODMiLCJpYXQiOjE2NzAxNzQ3MDQsImV4cCI6MTY3MDI2MTEwNCwic3ViIjoiVVNFUl9BVVRIRU5USUNBVElPTiJ9.nZo3dD9YY_bjxyxmL0TBlQi5ckjXjU5m-9bf0ZCDvtY',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();

      const webhook: BucketWebhook = await new BucketWebhook(
        {},
        stage.context.storage,
      ).populateById(response.body.data.id);
      expect(webhook.exists()).toBeTruthy();
      try {
        await webhook.validate();
      } catch (err) {
        await webhook.handle(err);
        expect(webhook.isValid()).toBeTruthy();
      }
    });

    test('User should be able to update bucket webhook', async () => {
      const response = await request(stage.http)
        .patch(`/buckets/${testBucket.bucket_uuid}/webhook/${testWebhook.id}`)
        .send({
          url: 'https://eob0hpm13hsj7sk.m.pipedream.net',
          authMethod: BucketWebhookAuthMethod.TOKEN,
          param1:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3V1aWQiOiIwMGYxNDdkZC1iNTAyLTQwZDQtYWJlYi1jNGVkNzNjN2I3ODMiLCJpYXQiOjE2NzAxNzQ3MDQsImV4cCI6MTY3MDI2MTEwNCwic3ViIjoiVVNFUl9BVVRIRU5USUNBVElPTiJ9.nZo3dD9YY_bjxyxmL0TBlQi5ckjXjU5m-9bf0ZCDvtY',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();

      const webhook: BucketWebhook = await new BucketWebhook(
        {},
        stage.context.storage,
      ).populateById(response.body.data.id);
      expect(webhook.exists()).toBeTruthy();
      expect(webhook.authMethod).toBe(BucketWebhookAuthMethod.TOKEN);
      expect(webhook.param1).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3V1aWQiOiIwMGYxNDdkZC1iNTAyLTQwZDQtYWJlYi1jNGVkNzNjN2I3ODMiLCJpYXQiOjE2NzAxNzQ3MDQsImV4cCI6MTY3MDI2MTEwNCwic3ViIjoiVVNFUl9BVVRIRU5USUNBVElPTiJ9.nZo3dD9YY_bjxyxmL0TBlQi5ckjXjU5m-9bf0ZCDvtY',
      );
    });
  });

  describe('Bucket webhook access tests', () => {
    let testUser3;
    let adminTestUser: TestUser;

    beforeAll(async () => {
      //Insert new user with access to testProject as PROJECT_USER - can view, cannot modify
      testUser3 = await createTestUser(
        stage.context.devConsole,
        stage.context.access,
        DefaultUserRole.PROJECT_USER,
        SqlModelStatus.ACTIVE,
        testProject.project_uuid,
      );
      adminTestUser = await createTestUser(
        stage.context.devConsole,
        stage.context.access,
        DefaultUserRole.ADMIN,
      );
    });

    test('User with role Project user, should be able to get bucket webhook', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.bucket_uuid}/webhook`)
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.url).toBeTruthy();
    });

    test('User should NOT be able to update ANOTHER USER bucket webhook', async () => {
      const response = await request(stage.http)
        .patch(`/buckets/${testBucket.bucket_uuid}/webhook/${testWebhook.id}`)
        .send({
          url: 'https://eob0hpm13hsj7sk.m.pipedream.net',
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('Admin User should be able to get bucket webhook', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.bucket_uuid}/webhook`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.url).toBeTruthy();
    });

    test('Admin User should NOT be able to create bucket webhook', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket2.id}/webhook`)
        .send({
          url: 'https://eob0hpm13hsj7sk.m.pipedream.net',
          authMethod: 'bearerToken',
          param1:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3V1aWQiOiIwMGYxNDdkZC1iNTAyLTQwZDQtYWJlYi1jNGVkNzNjN2I3ODMiLCJpYXQiOjE2NzAxNzQ3MDQsImV4cCI6MTY3MDI2MTEwNCwic3ViIjoiVVNFUl9BVVRIRU5USUNBVElPTiJ9.nZo3dD9YY_bjxyxmL0TBlQi5ckjXjU5m-9bf0ZCDvtY',
        })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Bucket webhook DELETE tests', () => {
    test('User should NOT be able to delete ANOTHER USER bucket webhook', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.bucket_uuid}/webhook/${testWebhook.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const webhook: BucketWebhook = await new BucketWebhook(
        {},
        stage.context.storage,
      ).populateById(testWebhook.id);
      expect(webhook.exists()).toBeTruthy();
    });

    test('User should be able to delete bucket webhook', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.bucket_uuid}/webhook/${testWebhook.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const webhook: BucketWebhook = await new BucketWebhook(
        {},
        stage.context.storage,
      ).populateById(response.body.data.id);
      expect(webhook.exists()).toBeFalsy();
    });
  });
});
