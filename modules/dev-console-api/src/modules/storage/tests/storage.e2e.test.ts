import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { FileUploadRequest } from '@apillon/storage/src/modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '@apillon/storage/src/modules/storage/models/file-upload-session.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import {
  FileStatus,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { createTestBucket } from '../../../../test/helpers/bucket';
import { createTestProject } from '../../../../test/helpers/project';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { BadRequestErrorCode, env } from '@apillon/lib';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

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
          .post(`/storage/file-upload-request`)
          .send({
            bucket_uuid: testBucket.bucket_uuid,
            session_uuid: testSession_uuid,
            fileName: 'myTestFile.txt',
            contentType: 'text/plain',
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        expect(response.body.data.signedUrlForUpload).toBeTruthy();
        expect(response.body.data.file_uuid).toBeTruthy();

        const fur: FileUploadRequest = await new FileUploadRequest(
          {},
          stage.storageContext,
        ).populateById(response.body.data.fileUploadRequestId);
        expect(fur.exists()).toBeTruthy();

        const session: FileUploadSession = await new FileUploadSession(
          {},
          stage.storageContext,
        ).populateById(fur.session_id);

        expect(session.exists()).toBeTruthy();
        expect(session.session_uuid).toBe(testSession_uuid);
        expect(session.sessionStatus).toBe(1);

        testS3SignedUrl = response.body.data.signedUrlForUpload;
        testS3FileUUID = response.body.data.file_uuid;
      });

      test('User should be able to upload file to s3 via signed URL', async () => {
        expect(testS3SignedUrl).toBeTruthy();
        const file = fs.readFileSync('test/assets/test.txt');
        const response = await request(testS3SignedUrl).put(``).send(file);

        expect(response.status).toBe(200);
      });

      test('User should recieve 422 error if missing required data', async () => {
        const response = await request(stage.http)
          .post(`/storage/file-upload-request`)
          .send({})
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(422);
        expect(response.body.errors).toBeTruthy();
        expect(response.body.errors.length).toBeGreaterThan(0);
        expect(
          response.body.errors.filter(
            (x) => x.statusCode == StorageErrorCode.FILE_NAME_NOT_PRESENT,
          ),
        ).toBeTruthy();
        expect(
          response.body.errors.filter(
            (x) =>
              x.statusCode == StorageErrorCode.BUCKET_PROJECT_UUID_NOT_PRESENT,
          ),
        ).toBeTruthy();
      });

      test('User should NOT be able to recieve S3 signed URL for ANOTHER USER project', async () => {
        const response = await request(stage.http)
          .post(`/storage/file-upload-request`)
          .send({
            bucket_uuid: testBucket.bucket_uuid,
            session_uuid: testSession_uuid,
            fileName: 'myTestFile.txt',
            contentType: 'text/plain',
          })
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });

      test('User should NOT be able to start transfer of ANOTHER PROJECT SESSION', async () => {
        const response = await request(stage.http)
          .post(`/storage/file-upload-session/${testSession_uuid}/end`)
          .send({
            directSync: true,
          })
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });

      test('User should be able to start transfer all files in session to IPFS', async () => {
        const response = await request(stage.http)
          .post(`/storage/file-upload-session/${testSession_uuid}/end`)
          .send({
            directSync: true,
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        testFile = await new File({}, stage.storageContext).populateByUUID(
          testS3FileUUID,
        );

        expect(testFile.exists()).toBeTruthy();
        expect(testFile.name).toBe('myTestFile.txt');
        expect(testFile.contentType).toBe('text/plain');
        expect(testFile.CID).toBeTruthy();

        //check session
        const session: FileUploadSession = await new FileUploadSession(
          {},
          stage.storageContext,
        ).populateByUUID(testSession_uuid);

        expect(session.sessionStatus).toBe(2);
      });

      test('User should be able to download uploaded file from apillon ipfs gateway', async () => {
        const response = await request(
          env.STORAGE_IPFS_PROVIDER + testFile.CID,
        ).get('');
        expect(response.status).toBe(200);
      });
    });

    describe('File details tests', () => {
      test('User should be able to get file details by file_uuid', async () => {
        const response = await request(stage.http)
          .get(`/storage/file-details?file_uuid=${testFile.file_uuid}`)
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        expect(response.body.data.fileStatus).toBe(FileStatus.PINNED_TO_CRUST);
        expect(response.body.data.file.file_uuid).toBe(testFile.file_uuid);
        expect(response.body.data.file.CID).toBe(testFile.CID);
        expect(response.body.data.file.s3FileKey).toBeTruthy();
        expect(response.body.data.file.name).toBe(testFile.name);
        expect(response.body.data.file.size).toBeGreaterThan(0);

        expect(response.body.data.crustStatus).toBeTruthy();
      });

      test('User should be able to get file details by CID', async () => {
        const response = await request(stage.http)
          .get(`/storage/file-details?cid=${testFile.CID}`)
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        expect(response.body.data.fileStatus).toBe(FileStatus.PINNED_TO_CRUST);
        expect(response.body.data.file.file_uuid).toBe(testFile.file_uuid);
        expect(response.body.data.file.CID).toBe(testFile.CID);
        expect(response.body.data.file.s3FileKey).toBeTruthy();
        expect(response.body.data.file.name).toBe(testFile.name);
        expect(response.body.data.file.size).toBeGreaterThan(0);

        expect(response.body.data.crustStatus).toBeTruthy();
      });

      test('User should NOT be able to get ANOTHER USER file details', async () => {
        const response = await request(stage.http)
          .get(`/storage/file-details?cid=${testFile.CID}`)
          .set('Authorization', `Bearer ${testUser2.token}`);
        expect(response.status).toBe(403);
      });

      test('User should recieve bad request, if neither CID nor file_uuid were added to query parameters', async () => {
        const response = await request(stage.http)
          .get(`/storage/file-details`)
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
          BadRequestErrorCode[BadRequestErrorCode.INVALID_QUERY_PARAMETERS],
        );
      });
    });

    describe('Multiple files in directories tests', () => {
      test('User should be able to recieve multiple S3 signed URLs, and upload multiple files to S3 bucket', async () => {
        testSession_uuid = uuidV4();

        //Upload 2 files, each into its own directory
        let response = await request(stage.http)
          .post(`/storage/file-upload-request`)
          .send({
            bucket_uuid: testBucket.bucket_uuid,
            session_uuid: testSession_uuid,
            fileName: 'myTestFile2.txt',
            contentType: 'text/plain',
            path: 'myTestDirectory',
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        const file1_uuid = response.body.data.file_uuid;
        const file1_signedUrlForUpload = response.body.data.signedUrlForUpload;

        const testFileContent = fs.readFileSync('test/assets/test.txt');
        response = await request(file1_signedUrlForUpload)
          .put(``)
          .send(testFileContent);
        expect(response.status).toBe(200);

        response = await request(stage.http)
          .post(`/storage/file-upload-request`)
          .send({
            bucket_uuid: testBucket.bucket_uuid,
            session_uuid: testSession_uuid,
            fileName: 'myTestFile3.txt',
            contentType: 'text/plain',
            path: 'mySecondTestDirectory/subdirectory',
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(201);
        const file2_uuid = response.body.data.file_uuid;
        const file2_signedUrlForUpload = response.body.data.signedUrlForUpload;

        response = await request(file2_signedUrlForUpload)
          .put(``)
          .send(testFileContent);
        expect(response.status).toBe(200);
        // trigger sync to IPFS
        response = await request(stage.http)
          .post(`/storage/file-upload-session/${testSession_uuid}/end`)
          .send({
            directSync: true,
          })
          .set('Authorization', `Bearer ${testUser.token}`);
        expect(response.status).toBe(200);

        //Check if files exists
        let file: File = await new File(
          {},
          stage.storageContext,
        ).populateByUUID(file1_uuid);

        expect(file.exists()).toBeTruthy();
        file = await new File({}, stage.storageContext).populateByUUID(
          file2_uuid,
        );
        expect(file.exists()).toBeTruthy();

        //Check if directories and files were created
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
  });
});
