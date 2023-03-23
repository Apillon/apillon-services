import { env, SqlModelStatus, ValidatorErrorCode } from '@apillon/lib';
import {
  FileStatus,
  FileUploadRequestFileStatus,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { FileUploadRequest } from '@apillon/storage/src/modules/storage/models/file-upload-request.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import {
  createTestBucket,
  createTestBucketFile,
  createTestBucketWebhook,
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { Project } from '../../project/models/project.model';
import { setupTest } from '../../../../test/helpers/setup';
import { executeDeleteBucketDirectoryFileWorker } from '@apillon/storage/src/scripts/serverless-workers/execute-delete-bucket-dir-file-worker';
import { IPFSService } from '@apillon/storage/src/modules/ipfs/ipfs.service';

describe('Storage tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;

  let testBucket: Bucket;
  let testSession_uuid: string = uuidV4();
  let testS3SignedUrl: string = undefined;
  let testS3FileUUID: string = undefined;

  let testFile: File;

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
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Storage tests', () => {
    describe('Single file tests', () => {
      test('User should be able to recieve S3 signed URL, used to upload file to S3', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({
            files: [
              {
                fileName: 'myTestFile.txt',
                contentType: 'text/plain',
              },
            ],
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        expect(response.body.data.files[0].url).toBeTruthy();
        expect(response.body.data.files[0].file_uuid).toBeTruthy();

        testS3SignedUrl = response.body.data.files[0].url;
        testS3FileUUID = response.body.data.files[0].file_uuid;
      });

      test('User should be able to upload file to s3 via signed URL', async () => {
        expect(testS3SignedUrl).toBeTruthy();
        const response = await request(testS3SignedUrl)
          .put(``)
          .send(new Date().toString() + uuidV4());

        expect(response.status).toBe(200);
      });

      test('User should recieve 422 error if missing required data', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({})
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(422);
        expect(response.body.errors).toBeTruthy();
        expect(response.body.errors.length).toBeGreaterThan(0);
        expect(
          response.body.errors.filter(
            (x) => x.code == ValidatorErrorCode.FILES_PROPERTY_NOT_PRESENT,
          ),
        ).toBeTruthy();
        expect(
          response.body.errors.filter(
            (x) => x.code == ValidatorErrorCode.FILES_PROPERTY_NOT_PRESENT,
          ),
        ).toBeTruthy();
      });

      test('User should NOT be able to recieve S3 signed URL for ANOTHER USER project', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({
            files: [
              {
                fileName: 'myTestFile.txt',
                contentType: 'text/plain',
              },
            ],
          })
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });

      test('Worker should transfer file from S3 to IPFS&CRUST', async () => {
        const response = await request(stage.http)
          .post(
            `/storage/${testBucket.bucket_uuid}/file/${testS3FileUUID}/sync-to-ipfs`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        testFile = await new File({}, stage.storageContext).populateByUUID(
          testS3FileUUID,
        );

        expect(testFile.exists()).toBeTruthy();
        expect(testFile.name).toBe('myTestFile.txt');
        expect(testFile.contentType).toBe('text/plain');
        expect(testFile.CID).toBeTruthy();
      });

      test('User should be able to download uploaded file from apillon ipfs gateway', async () => {
        expect(testFile).toBeTruthy();
        const response = await request(
          env.STORAGE_IPFS_GATEWAY + testFile.CID,
        ).get('');
        expect(response.status).toBe(200);
      });
    });

    describe('File details tests', () => {
      test('User should be able to get file details by file_uuid', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}/detail`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        expect(response.body.data.fileStatus).toBe(FileStatus.PINNED_TO_CRUST);
        expect(response.body.data.file.file_uuid).toBe(testFile.file_uuid);
        expect(response.body.data.file.CID).toBe(testFile.CID);
        expect(response.body.data.file.name).toBe(testFile.name);
        expect(response.body.data.file.size).toBeGreaterThan(0);
      });

      test('User should be able to get file details by CID', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.CID}/detail`)
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        expect(response.body.data.fileStatus).toBe(FileStatus.PINNED_TO_CRUST);
        expect(response.body.data.file.file_uuid).toBe(testFile.file_uuid);
        expect(response.body.data.file.CID).toBe(testFile.CID);
        expect(response.body.data.file.name).toBe(testFile.name);
        expect(response.body.data.file.size).toBeGreaterThan(0);
      });

      test('User should NOT be able to get ANOTHER USER file details', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}/detail`,
          )
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });
    });

    describe('Multiple files in directories tests', () => {
      test('User should be able to upload multiple files to Apillon storage using session', async () => {
        testSession_uuid = uuidV4();

        //Upload 2 files, each into its own directory
        let response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({
            session_uuid: testSession_uuid,
            files: [
              {
                fileName: 'myTestFile2.txt',
                contentType: 'text/plain',
                path: 'myTestDirectory',
              },
              {
                fileName: 'myTestFile3.txt',
                contentType: 'text/plain',
                path: 'mySecondTestDirectory/subdirectory',
              },
            ],
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);

        const myTestFile2Fur = response.body.data.files.find(
          (x) => x.fileName == 'myTestFile2.txt',
        );
        const myTestFile3Fur = response.body.data.files.find(
          (x) => x.fileName == 'myTestFile3.txt',
        );

        response = await request(myTestFile2Fur.url)
          .put(``)
          .send(new Date().toString() + 'File 2');
        expect(response.status).toBe(200);

        response = await request(myTestFile3Fur.url)
          .put(``)
          .send(new Date().toString() + 'File 3');
        expect(response.status).toBe(200);
        // trigger sync to IPFS
        response = await request(stage.http)
          .post(
            `/storage/${testBucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
          )
          .send({
            directSync: true,
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        //Check if files exists
        let file: File = await new File(
          {},
          stage.storageContext,
        ).populateByUUID(myTestFile2Fur.file_uuid);

        expect(file.exists()).toBeTruthy();
        file = await new File({}, stage.storageContext).populateByUUID(
          myTestFile3Fur.file_uuid,
        );
        expect(file.exists()).toBeTruthy();

        //Check if directories exists and are in correct hiearchy
        const dirs: Directory[] = await new Directory(
          {},
          stage.storageContext,
        ).populateDirectoriesInBucket(testBucket.id, stage.storageContext);

        expect(dirs.length).toBe(3);

        //Check directories content
        expect(dirs.find((x) => x.name == 'myTestDirectory')).toBeTruthy();
        const mySecondTestDirectory: Directory = dirs.find(
          (x) => x.name == 'mySecondTestDirectory',
        );
        expect(mySecondTestDirectory).toBeTruthy();
        const subdirectory: Directory = dirs.find(
          (x) => x.name == 'subdirectory',
        );
        expect(subdirectory).toBeTruthy();
        expect(subdirectory.parentDirectory_id).toBe(mySecondTestDirectory.id);
      });
    });

    describe('Single upload request, for multiple files', () => {
      test('User should be able to recieve multiple s3 urls for upload', async () => {
        testSession_uuid = uuidV4();

        //Get urls for upload
        let response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({
            session_uuid: testSession_uuid,
            files: [
              {
                fileName: 'abcd.txt',
                path: '',
              },
              {
                fileName: 'uvz.txt',
                path: '',
              },
            ],
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        expect(response.body.data.files.length).toBe(2);
        const abcdUrlResponse = response.body.data.files.find(
          (x) => x.fileName == 'abcd.txt',
        );
        const uvzUrlResponse = response.body.data.files.find(
          (x) => x.fileName == 'uvz.txt',
        );

        expect(abcdUrlResponse).toBeTruthy();
        expect(uvzUrlResponse).toBeTruthy();

        response = await request(abcdUrlResponse.url)
          .put(``)
          .send(new Date().toString() + 'abcd');
        expect(response.status).toBe(200);

        response = await request(uvzUrlResponse.url)
          .put(``)
          .send(new Date().toString() + 'uvz');
        expect(response.status).toBe(200);
        // trigger sync to IPFS
        response = await request(stage.http)
          .post(
            `/storage/${testBucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
          )
          .send({
            directSync: true,
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        //Check if files exists
        let file: File = await new File(
          {},
          stage.storageContext,
        ).populateByUUID(abcdUrlResponse.file_uuid);

        expect(file.exists()).toBeTruthy();
        file = await new File({}, stage.storageContext).populateByUUID(
          abcdUrlResponse.file_uuid,
        );
        expect(file.exists()).toBeTruthy();
      });

      test('User should NOT be able to recieve multiple s3 urls for upload for ANOTHER USER bucket', async () => {
        testSession_uuid = uuidV4();

        //Get urls for upload
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({
            session_uuid: testSession_uuid,
            files: [
              {
                fileName: 'jjjj.txt',
                path: '',
              },
            ],
          })
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });
    });

    describe('Wrap files into IPFS directory tests', () => {
      test('User should be able to upload multiple files to Apillon storage using session, and wrap those files into directory on IPFS', async () => {
        testSession_uuid = uuidV4();

        //Upload 2 files, each into its own directory
        let response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
          .send({
            session_uuid: testSession_uuid,
            files: [
              {
                fileName: 'index.html',
                contentType: 'text/html',
                path: '',
              },
              {
                fileName: 'styles.css',
                contentType: 'text/css',
                path: 'styles',
              },
            ],
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        const file1FUR = response.body.data.files.find(
          (x) => x.fileName == 'index.html',
        );
        const file2FUR = response.body.data.files.find(
          (x) => x.fileName == 'styles.css',
        );

        response = await request(file1FUR.url)
          .put(``)
          .send(
            '<h1>My page on IPFS</h1><p>Curr date: ' +
              new Date().toString() +
              '</p>',
          );
        expect(response.status).toBe(200);

        response = await request(file2FUR.url)
          .put(``)
          .send('h1{font-size: 50px;}');
        expect(response.status).toBe(200);
        // trigger sync to IPFS
        response = await request(stage.http)
          .post(
            `/storage/${testBucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
          )
          .send({
            directSync: true,
            wrapWithDirectory: true,
            directoryPath: 'my test page',
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        //Check if index.html file exists
        const indexFile: File = await new File(
          {},
          stage.storageContext,
        ).populateByUUID(file1FUR.file_uuid);

        expect(indexFile.exists()).toBeTruthy();
        expect(indexFile.CID).toBeTruthy();
        expect(indexFile.directory_id).toBeTruthy();

        //Check if styles.css file exists
        const cssFile = await new File({}, stage.storageContext).populateByUUID(
          file2FUR.file_uuid,
        );
        expect(cssFile.exists()).toBeTruthy();
        expect(cssFile.CID).toBeTruthy();
        expect(cssFile.directory_id).toBeTruthy();

        //Check directories
        const dirs: Directory[] = await new Directory(
          {},
          stage.storageContext,
        ).populateDirectoriesInBucket(testBucket.id, stage.storageContext);

        const wrappingDir: Directory = dirs.find(
          (x) => x.name == 'my test page',
        );
        expect(wrappingDir?.CID).toBeTruthy();
        expect(wrappingDir?.id).toBe(indexFile.directory_id);

        const cssDir: Directory = dirs.find((x) => x.name == 'styles');
        expect(cssDir).toBeTruthy();
        expect(cssDir.parentDirectory_id).toBe(wrappingDir.id);
        expect(cssDir.id).toBe(cssFile.directory_id);
      });
    });

    describe('Tests to upload file to bucket, which has specified webhook', () => {
      let testBucketWithWebhook;
      beforeAll(async () => {
        testBucketWithWebhook = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject,
        );

        await createTestBucketWebhook(
          stage.storageContext,
          testBucketWithWebhook,
        );
      });
      test('User should be able to upload file to bucket which has webhook set up', async () => {
        let response = await request(stage.http)
          .post(`/storage/${testBucketWithWebhook.bucket_uuid}/files-upload`)
          .send({
            files: [{ fileName: 'myTestFile.txt', contentType: 'text/plain' }],
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        expect(response.body.data.files[0].url).toBeTruthy();
        expect(response.body.data.files[0].file_uuid).toBeTruthy();
        const file_uuid = response.body.data.files[0].file_uuid;

        const testFileContent = uuidV4();
        response = await request(response.body.data.files[0].url)
          .put(``)
          .send(testFileContent);
        expect(response.status).toBe(200);

        response = await request(stage.http)
          .post(
            `/storage/${testBucketWithWebhook.bucket_uuid}/file/${file_uuid}/sync-to-ipfs`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        const file: File = await new File(
          {},
          stage.storageContext,
        ).populateByUUID(file_uuid);

        expect(file.exists()).toBeTruthy();
      });
    });

    describe('Tests for file-upload listing', () => {
      let testBucket2;
      let fur1: FileUploadRequest;
      let fur2: FileUploadRequest;
      beforeAll(async () => {
        testBucket2 = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject,
        );
        //Insert some fake file-upload-requests

        fur1 = await new FileUploadRequest({}, stage.storageContext)
          .populate({
            bucket_id: testBucket2.id,
            file_uuid: uuidV4(),
            fileName: 'file1.txt',
            contentType: 'text/plain',
            s3FileKey: 's3url/file1.txt',
            fileStatus:
              FileUploadRequestFileStatus.SIGNED_URL_FOR_UPLOAD_GENERATED,
          })
          .insert();

        fur2 = await new FileUploadRequest({}, stage.storageContext)
          .populate({
            bucket_id: testBucket2.id,
            file_uuid: uuidV4(),
            fileName: 'file2.txt',
            contentType: 'text/plain',
            s3FileKey: 's3url/file2.txt',
            fileStatus: FileUploadRequestFileStatus.UPLOAD_COMPLETED,
          })
          .insert();
      });
      test('User should be able to get list of file uploads', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket2.bucket_uuid}/file-uploads`)
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);
        expect(response.body.data.items.length).toBe(2);
        expect(response.body.data.total).toBe(2);
        expect(response.body.data.items[0].file_uuid).toBeTruthy();
        expect(response.body.data.items[0].fileName).toBeTruthy();
        expect(response.body.data.items[0].contentType).toBeTruthy();
        expect(response.body.data.items[0].fileStatus).toBeTruthy();
      });

      test('User should be able to get list of file uploads - filtered by search', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/${testBucket2.bucket_uuid}/file-uploads?search=${fur1.fileName}`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].fileName).toBe(fur1.fileName);
      });

      test('User should be able to get list of file uploads - filtered by fileStatus', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/${testBucket2.bucket_uuid}/file-uploads?fileStatus=${FileUploadRequestFileStatus.UPLOAD_COMPLETED}`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].fileName).toBe(fur2.fileName);
        expect(response.body.data.items[0].fileStatus).toBe(fur2.fileStatus);
      });

      test('User should NOT be able to get list of ANOTHER USER file uploads', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket2.bucket_uuid}/file-uploads`)
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });
    });
    describe('Delete file tests', () => {
      let bucketForDeleteTests: Bucket = undefined;
      let deleteBucketTestFile1: File = undefined;
      let testFile2: File = undefined;
      beforeAll(async () => {
        bucketForDeleteTests = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject,
        );

        deleteBucketTestFile1 = await createTestBucketFile(
          stage.storageContext,
          bucketForDeleteTests,
          'delete file test.txt',
          'text/plain',
          true,
        );

        testFile2 = await createTestBucketFile(
          stage.storageContext,
          bucketForDeleteTests,
          'This file should not be deleted.txt',
          'text/plain',
          true,
        );
      });

      test('User should NOT be able to delete ANOTHER USER file', async () => {
        const response = await request(stage.http)
          .delete(
            `/storage/${bucketForDeleteTests.bucket_uuid}/file/${deleteBucketTestFile1.id}`,
          )
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);

        const f: File = await new File({}, stage.storageContext).populateById(
          deleteBucketTestFile1.id,
        );
        expect(f.exists()).toBeTruthy();
      });

      test('User should be able to mark file for deletion', async () => {
        const response = await request(stage.http)
          .delete(
            `/storage/${bucketForDeleteTests.bucket_uuid}/file/${deleteBucketTestFile1.id}`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        const f: File = await new File({}, stage.storageContext).populateById(
          deleteBucketTestFile1.id,
        );
        expect(f.status).toBe(SqlModelStatus.MARKED_FOR_DELETION);
      });

      test('User should be able to list files, that are marked for deletion', async () => {
        const response = await request(stage.http)
          .get(`/storage/${bucketForDeleteTests.bucket_uuid}/trashed-files`)
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].id).toBe(deleteBucketTestFile1.id);
      });

      test('User should be able to unmark file for deletion', async () => {
        const testFileToCancelDeletion = await createTestBucketFile(
          stage.storageContext,
          bucketForDeleteTests,
          'delete file test.txt',
          'text/plain',
          true,
          undefined,
          SqlModelStatus.MARKED_FOR_DELETION,
        );
        const response = await request(stage.http)
          .patch(
            `/storage/${bucketForDeleteTests.bucket_uuid}/file/${testFileToCancelDeletion.id}/cancel-deletion`,
          )
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        const f: File = await new File({}, stage.storageContext).populateById(
          testFileToCancelDeletion.id,
        );
        expect(f.status).toBe(SqlModelStatus.ACTIVE);
      });

      test('Storage delete worker should NOT delete file if file is not long enough in status 8 (marked for delete)', async () => {
        await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
        const f: File = await new File({}, stage.storageContext).populateById(
          deleteBucketTestFile1.id,
        );
        expect(f.status).toBe(SqlModelStatus.MARKED_FOR_DELETION);
      });

      test('Storage delete worker should delete file if file is long enough in status 8 (marked for delete)', async () => {
        let f: File = await new File({}, stage.storageContext).populateById(
          deleteBucketTestFile1.id,
        );
        f.markedForDeletionTime = new Date();
        f.markedForDeletionTime.setFullYear(
          f.markedForDeletionTime.getFullYear() - 1,
        );
        await f.update();

        await executeDeleteBucketDirectoryFileWorker(stage.storageContext);
        f = await new File({}, stage.storageContext).populateById(
          deleteBucketTestFile1.id,
        );
        expect(f.exists()).toBeFalsy();
        expect(
          await IPFSService.isCIDPinned(deleteBucketTestFile1.CID),
        ).toBeFalsy();

        //Check if bucket size was decreased
        const tmpB: Bucket = await new Bucket(
          {},
          stage.storageContext,
        ).populateById(bucketForDeleteTests.id);

        expect(tmpB.size).toBeLessThan(bucketForDeleteTests.size);

        //Check that other files were not affected / deleted
        f = await new File({}, stage.storageContext).populateById(testFile2.id);
        expect(f.exists()).toBeTruthy();
        expect(await IPFSService.isCIDPinned(testFile2.CID)).toBeTruthy();
      });
    });
  });
});
