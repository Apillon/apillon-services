import { DefaultUserRole, QuotaCode, SqlModelStatus } from '@apillon/lib';
import {
  BucketType,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import * as request from 'supertest';
import { createTestBucket } from '@apillon/tests-lib';
import { createTestProject } from '../../../../test/helpers/project';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';

describe('Storage bucket tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;

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

    await stage.configContext.mysql.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid,  object_uuid, package_id, value)
    VALUES 
      (
        5,
        ${QuotaCode.MAX_FILE_BUCKETS},
        '${testProject.project_uuid}',
        null, 
        null,
        '5'
      ),
      (
        5,
        ${QuotaCode.MAX_HOSTING_BUCKETS},
        '${testProject.project_uuid}',
        null, 
        null,
        '5'
      )
    `);
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
    });

    test('User should NOT be able to get ANOTHER USER bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject2.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get bucket by id', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.bucket_uuid).toBeTruthy();
      expect(response.body.data.project_uuid).toBeTruthy();
      expect(response.body.data.bucketType).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.maxSize).toBeTruthy();
    });

    test('User should recieve 404 if bucket does not exists', async () => {
      const response = await request(stage.http)
        .get(`/buckets/555`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(StorageErrorCode.BUCKET_NOT_FOUND);
      expect(response.body.message).toBe(
        StorageErrorCode[StorageErrorCode.BUCKET_NOT_FOUND],
      );
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

    test('User should NOT create bucket in ANOTHER user project', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'Bucket changed name',
          bucketType: BucketType.HOSTING,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
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

  describe('Bucket access tests', () => {
    beforeAll(async () => {
      //Insert new user with access to testProject as PROJECT_USER - can view, cannot modify
      testUser3 = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
        DefaultUserRole.PROJECT_USER,
        SqlModelStatus.ACTIVE,
        testProject.project_uuid,
      );
    });

    test('User with role "ProjectUser" should be able to get bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.bucket_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.bucketType).toBeTruthy();
    });

    test('User with role "ProjectUser" should NOT be able to create new bucket', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My test bucket 2',
          bucketType: 1,
        })
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(403);
    });

    test('User with role "ProjectUser" should NOT be able to update bucket', async () => {
      const response = await request(stage.http)
        .patch(`/buckets/${testBucket.id}`)
        .send({
          name: 'Bucket changed name',
          bucketType: BucketType.HOSTING,
        })
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(403);
    });

    test('User with role "ProjectUser" should NOT be able to delete bucket', async () => {
      const tmpBucket = await createTestBucket(
        testUser,
        stage.storageContext,
        testProject,
      );

      const response = await request(stage.http)
        .delete(`/buckets/${tmpBucket.id}`)
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(403);

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(tmpBucket.bucket_uuid);
      expect(b.exists()).toBe(true);
    });
  });

  describe('Bucket quotas tests', () => {
    let quotaTestsUser: TestUser = undefined;
    let quotaTestProject: Project = undefined;

    beforeAll(async () => {
      quotaTestsUser = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
      );
      quotaTestProject = await createTestProject(
        quotaTestsUser,
        stage.devConsoleContext,
      );
      //create 10 buckets - max api keys on project quota reached
      for (let i = 0; i < 10; i++) {
        await createTestBucket(
          quotaTestsUser,
          stage.storageContext,
          quotaTestProject,
          BucketType.STORAGE,
        );
      }
    });

    test('User should recieve status 400 when max buckets quota is reached', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          project_uuid: quotaTestProject.project_uuid,
          name: 'My test bucket',
          bucketType: 1,
        })
        .set('Authorization', `Bearer ${quotaTestsUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        StorageErrorCode[StorageErrorCode.MAX_BUCKETS_REACHED],
      );
    });

    test('User should be able to create hosting bucket even though storage bucket quota si reached', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          project_uuid: quotaTestProject.project_uuid,
          name: 'My test bucket',
          bucketType: BucketType.HOSTING,
        })
        .set('Authorization', `Bearer ${quotaTestsUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
    });
  });
});
