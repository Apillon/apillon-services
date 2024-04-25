import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
import {
  BucketType,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import {
  Stage,
  TestUser,
  createTestBucket,
  createTestBucketFile,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../../test/helpers/setup';
import { Project } from '../../../project/models/project.model';

describe('Storage bucket tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testBucket: Bucket;

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
    testProject2 = await createTestProject(testUser2, stage);

    testBucket = await createTestBucket(
      testUser,
      stage.context.storage,
      testProject,
    );

    await createTestBucketFile(
      stage.context.storage,
      testBucket,
      'file.txt',
      'text/plain',
      true,
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
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.bucket_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.bucketType).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject2.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get bucket by uuid', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.bucket_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.bucket_uuid).toBeTruthy();
      expect(response.body.data.project_uuid).toBeTruthy();
      expect(response.body.data.bucketType).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
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
          bucketType: BucketType.STORAGE,
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
          bucketType: BucketType.STORAGE,
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
      expect(response.body.data.bucket_uuid).toBeTruthy();
      expect(response.body.data.bucketType).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
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
        .patch(`/buckets/${testBucket.bucket_uuid}`)
        .send({
          name: 'Bucket changed name',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.bucket_uuid).toBeTruthy();
      expect(response.body.data.name).toBe('Bucket changed name');

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.name).toBe('Bucket changed name');
    });
  });

  describe('Bucket access tests', () => {
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

    test('User with role "ProjectUser" should be able to get bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
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
        stage.context.storage,
        testProject,
      );

      const response = await request(stage.http)
        .delete(`/buckets/${tmpBucket.id}`)
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(403);

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateByUUID(tmpBucket.bucket_uuid);
      expect(b.exists()).toBe(true);
    });

    test('Admin User should be able to get bucket list', async () => {
      const response = await request(stage.http)
        .get(`/buckets?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.items[0]?.bucket_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.bucketType).toBeTruthy();
    });

    test('Admin User should NOT be able to create new bucket', async () => {
      const response = await request(stage.http)
        .post(`/buckets`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My test bucket 3',
          bucketType: 1,
        })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Admin User should NOT be able to update bucket', async () => {
      const response = await request(stage.http)
        .patch(`/buckets/${testBucket.id}`)
        .send({
          name: 'Bucket changed name',
          bucketType: BucketType.HOSTING,
        })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Admin User should NOT be able to delete bucket', async () => {
      const tmpBucket = await createTestBucket(
        testUser,
        stage.context.storage,
        testProject,
      );

      const response = await request(stage.http)
        .delete(`/buckets/${tmpBucket.id}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(403);

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateByUUID(tmpBucket.bucket_uuid);
      expect(b.exists()).toBe(true);
    });
  });

  describe('Delete bucket tests', () => {
    test('User should NOT be able to delete ANOTHER USER bucket', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.bucket_uuid}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.exists()).toBeTruthy();
      expect(b.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('User should not be able to delete bucket which contains files', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.bucket_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(40006021);

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('User should be able to delete empty bucket', async () => {
      //Prepare new test bucket and add some files to it
      const deleteBucketTestBucket = await createTestBucket(
        testUser,
        stage.context.storage,
        testProject,
      );

      const response = await request(stage.http)
        .delete(`/buckets/${deleteBucketTestBucket.bucket_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateByUUID(deleteBucketTestBucket.bucket_uuid);
      expect(b.exists()).toBeFalsy();
    });
  });
});
