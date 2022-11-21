import { BucketType } from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import * as request from 'supertest';
import { createTestBucket } from '../../../../test/helpers/bucket';
import { createTestProject } from '../../../../test/helpers/project';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';

describe('Storage bucket tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testBucket: Bucket;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);

    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Bucket CRUD tests', () => {
    test('User should be able to get bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.bucket_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.bucketType).toBeTruthy();
      expect(response.body.data.items[0]?.maxSize).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject2.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should recieve 422 if invalid body', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          name: 'Bucket changed name',
          bucketType: BucketType.HOSTING,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should be able to create new bucket', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My test bucket',
          bucketType: 1,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.bucket_uuid).toBeTruthy();
      expect(response.body.data.bucketType).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(response.body.data.bucket_uuid);
      expect(b.exists()).toBeTruthy();
      try {
        await b.validate();
      } catch (err) {
        await b.handle(err);
        expect(b.isValid()).toBeTruthy();
      }
    });

    test('User should be able to update bucket', async () => {
      const response = await request(stage.http)
        .patch(`/buckets/${testBucket.id}`)
        .send({
          name: 'Bucket changed name',
          bucketType: BucketType.HOSTING,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBe('Bucket changed name');
      expect(response.body.data.name).toBe('Bucket changed name');

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.name).toBe('Bucket changed name');
      expect(b.bucketType).toBe(BucketType.HOSTING);
    });

    test('User should NOT be able to delete ANOTHER USER bucket', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.exists()).toBeTruthy();
    });

    test('User should be able to delete bucket', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.exists()).toBe(false);
    });
  });
});
