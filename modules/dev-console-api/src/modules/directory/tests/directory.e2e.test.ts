import { DefaultUserRole, env, SqlModelStatus } from '@apillon/lib';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import {
  createTestBucket,
  createTestBucketDirectory,
  createTestBucketFile,
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { Project } from '../../project/models/project.model';
import { setupTest } from '../../../../test/helpers/setup';
import { executeDeleteBucketDirectoryFileWorker } from '@apillon/storage/src/scripts/serverless-workers/execute-delete-bucket-dir-file-worker';
import { IPFSService } from '@apillon/storage/src/modules/ipfs/ipfs.service';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';

describe('Storage directory tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;

  let testProject: Project;

  let testBucket: Bucket;
  let testDirectory: Directory;
  let testDirectory2: Directory;

  let testDirectoryFile: File;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);

    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
    );

    testDirectory = await createTestBucketDirectory(
      stage.storageContext,
      testProject,
      testBucket,
      true,
      undefined,
      'My directory',
      'test',
    );

    //Add additional file to dir - file exists on IPFS
    testDirectoryFile = await createTestBucketFile(
      stage.storageContext,
      testBucket,
      'fileInDirectory.txt',
      'text/plain',
      true,
      testDirectory.id,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Get directory content tests', () => {
    test('User should be able to get bucket content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.type).toBe('directory');
      expect(response.body.data.items[0]?.name).toBe(testDirectory.name);
    });

    test('User should be able to get directory content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}&directory_id=${testDirectory.id}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(3);
      expect(response.body.data.items[0]?.type).toBe('file');
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.contentType).toBeTruthy();
      expect(response.body.data.items[0]?.size).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER bucket content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Directory CUD tests', () => {
    test('User should be able to create new directory', async () => {
      const response = await request(stage.http)
        .post(`/directories`)
        .send({
          bucket_id: testBucket.id,
          name: 'My test directory',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.directory_uuid).toBeTruthy();

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(d.exists()).toBeTruthy();
      try {
        await d.validate();
      } catch (err) {
        await d.handle(err);
        expect(d.isValid()).toBeTruthy();
      }
    });

    test('User should NOT be able to create new directory if missing required data', async () => {
      const response = await request(stage.http)
        .post(`/directories`)
        .send({
          name: 'My test directory',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should be able to update directory', async () => {
      const response = await request(stage.http)
        .patch(`/directories/${testDirectory.id}`)
        .send({
          name: 'Some new directory name',
          CID: 'some imaginary CID',
          description: 'my test description',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Some new directory name');

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectory.id);
      expect(d.exists()).toBeTruthy();
      try {
        await d.validate();
      } catch (err) {
        await d.handle(err);
        expect(d.isValid()).toBeTruthy();
      }
      expect(d.name).toBe('Some new directory name');
      expect(d.CID).toBe('some imaginary CID');
      expect(d.description).toBe('my test description');
    });
  });

  describe('Directory access tests', () => {
    beforeAll(async () => {
      //Insert new user with access to testProject as PROJECT_USER - can view, cannot modify
      testUser3 = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
        DefaultUserRole.PROJECT_USER,
        SqlModelStatus.ACTIVE,
        testProject.project_uuid,
      );

      testDirectory2 = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testBucket,
        true,
        undefined,
        'My 2. directory',
        'test',
      );
    });

    test('User with role "ProjectUser" should be able to get directory content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}&directory_id=${testDirectory2.id}`,
        )
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      expect(response.body.data.items[0]?.type).toBe('file');
    });

    //TODO ! can user with role "ProjectUser" create/update/delete directory
  });

  describe('Delete directory tests', () => {
    let testDirectoryToDelete;
    beforeAll(async () => {
      //Create new directories, to test delete functions
      testDirectoryToDelete = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testBucket,
        true,
        undefined,
        'My directory to delete',
      );
    });

    test('User should NOT be able to delete ANOTHER USER directory', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${testDirectoryToDelete.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectoryToDelete.id);
      expect(d.exists()).toBeTruthy();
      expect(d.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('User should be able to delete directory', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${testDirectoryToDelete.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(d.exists()).toBeTruthy();
      expect(d.status).toBe(SqlModelStatus.MARKED_FOR_DELETION);
    });

    test('User should be able to cancel directory deletion', async () => {
      const testDirectoryToCancelDeletion = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testBucket,
        true,
        undefined,
        'My directory to delete',
        undefined,
        SqlModelStatus.MARKED_FOR_DELETION,
      );

      const response = await request(stage.http)
        .patch(
          `/directories/${testDirectoryToCancelDeletion.id}/cancel-deletion`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectoryToCancelDeletion.id);
      expect(d.exists()).toBeTruthy();
      expect(d.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('Storage delete worker should NOT delete directory if directory is not long enough in status 8 (marked for delete)', async () => {
      await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectoryToDelete.id);
      expect(d.status).toBe(SqlModelStatus.MARKED_FOR_DELETION);
    });

    test('Storage delete worker should delete directory if directory is long enough in status 8 (marked for delete)', async () => {
      let d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectoryToDelete.id);
      d.markedForDeletionTime = new Date();
      d.markedForDeletionTime.setFullYear(
        d.markedForDeletionTime.getFullYear() - 1,
      );
      await d.update();

      await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
      d = await new Directory({}, stage.storageContext).populateById(
        testDirectoryToDelete.id,
      );
      expect(d.exists()).toBeFalsy();

      //Check if other directories and files are still active
      d = await new Directory({}, stage.storageContext).populateById(
        testDirectory.id,
      );
      expect(d.exists()).toBeTruthy();
    });

    test('Storage delete worker should delete directory and subdirectories and files in directory', async () => {
      //Dir with subdirs and files in it
      const date = new Date();
      date.setDate(date.getDate() - env.STORAGE_DELETE_AFTER_INTERVAR - 1);
      const testDirectoryWithSubdirectories: Directory = new Directory(
        {},
        stage.storageContext,
      )
        .fake()
        .populate({
          project_uuid: testProject.project_uuid,
          bucket_id: testBucket.id,
          name: 'dir with subdirs',
          markedForDeletionTime: date,
          status: SqlModelStatus.MARKED_FOR_DELETION,
        });

      await testDirectoryWithSubdirectories.insert();
      //Add files
      const deleteBucketTestFile1 = await createTestBucketFile(
        stage.storageContext,
        testBucket,
        'xyz.txt',
        'text/plain',
        true,
        testDirectoryWithSubdirectories.id,
      );

      expect(
        await IPFSService.isCIDPinned(deleteBucketTestFile1.CID),
      ).toBeTruthy();

      //Subdir
      const testDirectorySubDir = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testBucket,
        false,
        testDirectoryWithSubdirectories.id,
        'My subdirectory to delete',
      );

      const deleteBucketTestFile2 = await createTestBucketFile(
        stage.storageContext,
        testBucket,
        'xyzz.txt',
        'text/plain',
        true,
        testDirectorySubDir.id,
      );

      //Execute worker
      await executeDeleteBucketDirectoryFileWorker(stage.storageContext);

      //Test variables
      let d = await new Directory({}, stage.storageContext).populateById(
        testDirectoryWithSubdirectories.id,
      );
      expect(d.exists()).toBeFalsy();

      //Check if subdirectory is deleted
      d = await new Directory({}, stage.storageContext).populateById(
        testDirectorySubDir.id,
      );
      expect(d.exists()).toBeFalsy();

      //Check if files in directory are deleted and unpined
      let f: File = await new File({}, stage.storageContext).populateById(
        deleteBucketTestFile1.id,
      );
      expect(f.exists()).toBeFalsy();
      expect(await IPFSService.isCIDPinned(f.CID)).toBeFalsy();

      f = await new File({}, stage.storageContext).populateById(
        deleteBucketTestFile2.id,
      );
      expect(f.exists()).toBeFalsy();
      expect(
        await IPFSService.isCIDPinned(deleteBucketTestFile1.CID),
      ).toBeFalsy();

      //Check if bucket size was decreased
      const tmpB: Bucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateById(testBucket.id);

      expect(tmpB.size).toBeLessThan(testBucket.size);

      //Check if other directories and files are still active
      d = await new Directory({}, stage.storageContext).populateById(
        testDirectory.id,
      );
      expect(d.exists()).toBeTruthy();

      f = await new File({}, stage.storageContext).populateById(
        testDirectoryFile.id.toString(),
      );
      expect(f.exists()).toBeTruthy();
      expect(await IPFSService.isCIDPinned(testDirectoryFile.CID)).toBeTruthy();
    });
  });
});
