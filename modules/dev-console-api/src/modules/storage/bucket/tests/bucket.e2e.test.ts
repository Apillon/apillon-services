import { DefaultUserRole, QuotaCode, SqlModelStatus } from '@apillon/lib';
import {
  BucketType,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { IPFSService } from '@apillon/storage/src/modules/ipfs/ipfs.service';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { executeDeleteBucketDirectoryFileWorker } from '@apillon/storage/src/scripts/serverless-workers/execute-delete-bucket-dir-file-worker';
import {
  createTestBucket,
  createTestBucketFile,
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../../test/helpers/setup';
import { Project } from '../../../project/models/project.model';

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
      expect(response.body.data.items.length).toBe(2);
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

  describe('Delete bucket tests', () => {
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
      expect(b.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('User should be able to mark bucket for deletion', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.status).toBe(SqlModelStatus.MARKED_FOR_DELETION);
    });

    test('User should be able to get TRASHED bucket list', async () => {
      const response = await request(stage.http)
        .get(
          `/buckets?project_uuid=${testProject.project_uuid}&status=${SqlModelStatus.MARKED_FOR_DELETION}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBe(testBucket.id);
      expect(response.body.data.items[0]?.status).toBe(
        SqlModelStatus.MARKED_FOR_DELETION,
      );
    });

    test('User should be able to unmark bucket for deletion', async () => {
      const testBucketToCancelDeletion = await createTestBucket(
        testUser,
        stage.storageContext,
        testProject,
        BucketType.STORAGE,
        SqlModelStatus.MARKED_FOR_DELETION,
      );
      const response = await request(stage.http)
        .patch(`/buckets/${testBucketToCancelDeletion.id}/cancel-deletion`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(testBucketToCancelDeletion.bucket_uuid);
      expect(b.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('Storage delete worker should NOT delete bucket if bucket is not long enough in status 8 (marked for delete)', async () => {
      await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
      const b: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(testBucket.bucket_uuid);
      expect(b.status).toBe(SqlModelStatus.MARKED_FOR_DELETION);
    });

    test('Storage delete worker should delete bucket if bucket is long enough in status 8 (marked for delete)', async () => {
      let b: Bucket = await new Bucket({}, stage.storageContext).populateByUUID(
        testBucket.bucket_uuid,
      );
      b.markedForDeletionTime = new Date();
      b.markedForDeletionTime.setFullYear(
        b.markedForDeletionTime.getFullYear() - 1,
      );
      await b.update();

      await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
      b = await new Bucket({}, stage.storageContext).populateByUUID(
        testBucket.bucket_uuid,
      );
      expect(b.exists()).toBeFalsy();
    });

    test('Storage delete worker should delete bucket and all files in it', async () => {
      //Prepare new test bucket and add some files to it
      const deleteBucketTestBucket = await createTestBucket(
        testUser,
        stage.storageContext,
        testProject,
      );

      const deleteBucketTestFile1 = await createTestBucketFile(
        stage.storageContext,
        deleteBucketTestBucket,
        'testingDelete.txt',
        'text/plain',
        true,
      );

      expect(
        await IPFSService.isCIDPinned(deleteBucketTestFile1.CID),
      ).toBeTruthy();

      //Mark bucket for deletion
      await deleteBucketTestBucket.markForDeletion();
      deleteBucketTestBucket.markedForDeletionTime = new Date();
      deleteBucketTestBucket.markedForDeletionTime.setFullYear(
        deleteBucketTestBucket.markedForDeletionTime.getFullYear() - 1,
      );
      await deleteBucketTestBucket.update();

      //Run worker and check if bucket was deleted
      await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
      const b = await new Bucket({}, stage.storageContext).populateByUUID(
        deleteBucketTestBucket.bucket_uuid,
      );
      expect(b.exists()).toBeFalsy();

      //Check if files were deleted and unpined
      const f: File = await new File({}, stage.storageContext).populateById(
        deleteBucketTestFile1.id,
      );
      expect(f.exists()).toBeFalsy();
      expect(
        await IPFSService.isCIDPinned(deleteBucketTestFile1.CID),
      ).toBeFalsy();
    });
  });
});
