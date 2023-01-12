import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
  env,
} from '@apillon/lib';
import {
  FileStatus,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { FileUploadRequest } from '@apillon/storage/src/modules/storage/models/file-upload-request.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { StorageService as StrageMSService } from '@apillon/storage/src/modules/storage/storage.service';
import {
  createTestApiKey,
  createTestBucket,
  createTestProject,
  createTestProjectService,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

describe('Storage tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let testBucket: Bucket;
  let apiKey: ApiKey = undefined;

  let testUser2: TestUser;
  let testProject2: Project;
  let testService2: Service;
  let testBucket2: Bucket;
  let apiKey2: ApiKey = undefined;

  let testS3SignedUrl: string = undefined;
  let testS3FileUUID: string = undefined;

  let testFile: File;
  let testFileContent: string;

  beforeAll(async () => {
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );
    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
    );

    apiKey = await createTestApiKey(stage.amsContext, testProject.project_uuid);
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.STORAGE,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.STORAGE,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.STORAGE,
      }),
    );

    //User 2 project & other data
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);
    testService2 = await createTestProjectService(
      stage.devConsoleContext,
      testProject2,
    );
    testBucket2 = await createTestBucket(
      testUser2,
      stage.storageContext,
      testProject2,
    );

    apiKey2 = await createTestApiKey(
      stage.amsContext,
      testProject2.project_uuid,
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.STORAGE,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.STORAGE,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.STORAGE,
      }),
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Storage Apillon API tests', () => {
    describe('Single file tests', () => {
      test('Application (through Apillon API) should be able to recieve S3 signed URL, used to upload file to S3', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/upload`)
          .send({
            fileName: 'myTestFile.txt',
            contentType: 'text/plain',
          })
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(201);
        expect(response.body.data.signedUrlForUpload).toBeTruthy();
        expect(response.body.data.fileUuid).toBeTruthy();

        const fur: FileUploadRequest = await new FileUploadRequest(
          {},
          stage.storageContext,
        ).populateById(response.body.data.fileUploadRequestId);
        expect(fur.exists()).toBeTruthy();

        testS3SignedUrl = response.body.data.signedUrlForUpload;
        testS3FileUUID = response.body.data.fileUuid;
      });

      test('Application should be able to upload file to s3 via signed URL', async () => {
        expect(testS3SignedUrl).toBeTruthy();
        testFileContent = new Date().toString();
        const response = await request(testS3SignedUrl)
          .put(``)
          .send(testFileContent);

        expect(response.status).toBe(200);

        //Run direct sync to IPFS
        await StrageMSService.endFileUpload(
          { file_uuid: testS3FileUUID },
          stage.storageContext,
        );

        testFile = await new File({}, stage.storageContext).populateByUUID(
          testS3FileUUID,
        );

        expect(testFile.exists()).toBeTruthy();
        expect(testFile.name).toBe('myTestFile.txt');
        expect(testFile.contentType).toBe('text/plain');
        expect(testFile.CID).toBeTruthy();
      });

      test('Application should recieve 422 error if missing required data', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/upload`)
          .send({})
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
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

      test('Application should NOT be able to recieve S3 signed URL for ANOTHER USER project', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/upload`)
          .send({
            fileName: 'myTestFile.txt',
            contentType: 'text/plain',
          })
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'Insufficient permissions to access this record',
        );
      });

      test('Application should be able to download uploaded file from apillon ipfs gateway', async () => {
        expect(testFile).toBeTruthy();
        const response = await request(
          env.STORAGE_IPFS_PROVIDER + testFile.CID,
        ).get('');
        expect(response.status).toBe(200);
        expect(response.text).toBe(testFileContent);
      });
    });

    describe('File details & list files tests', () => {
      test('Application should be able to get file details by file_uuid', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}/detail`,
          )
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);

        expect(response.body.data.fileStatus).toBe(FileStatus.PINNED_TO_CRUST);
        expect(response.body.data.file.fileUuid).toBe(testFile.file_uuid);
        expect(response.body.data.file.CID).toBe(testFile.CID);
        expect(response.body.data.file.name).toBe(testFile.name);
        expect(response.body.data.file.size).toBeGreaterThan(0);
      });

      test('Application should be able to get file details by CID', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.CID}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);

        expect(response.body.data.fileStatus).toBe(FileStatus.PINNED_TO_CRUST);
        expect(response.body.data.file.fileUuid).toBe(testFile.file_uuid);
        expect(response.body.data.file.CID).toBe(testFile.CID);
        expect(response.body.data.file.name).toBe(testFile.name);
        expect(response.body.data.file.size).toBeGreaterThan(0);
      });

      test('Application should NOT be able to get ANOTHER USER file details', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}/detail`,
          )
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'Insufficient permissions to access this record',
        );
      });

      test('Application should be able to list files in bucket', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/content`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);

        expect(response.body.data.total).toBe(1);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].type).toBe('file');
        expect(response.body.data.items[0].CID).toBeTruthy();
        expect(response.body.data.items[0].fileUuid).toBeTruthy();
        expect(response.body.data.items[0].name).toBeTruthy();
        expect(response.body.data.items[0].id).toBeTruthy();
      });

      test('Application should NOT be able to list files in ANOTHER bucket', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/content`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'Insufficient permissions to access this record',
        );
      });
    });

    describe('Delete file tests', () => {
      test('Application should NOT be able to delete ANOTHER application uploaded file', async () => {
        expect(testFile).toBeTruthy();
        const response = await request(stage.http)
          .delete(`/storage/${testBucket.bucket_uuid}/file/${testFile.CID}`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'Insufficient permissions to modify this record',
        );
      });
      test('Application should be able to delete uploaded file', async () => {
        expect(testFile).toBeTruthy();
        const response = await request(stage.http)
          .delete(`/storage/${testBucket.bucket_uuid}/file/${testFile.CID}`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);
        testFile = await new File({}, stage.storageContext).populateByUUID(
          testS3FileUUID,
        );
        expect(testFile.exists()).toBeFalsy();
      });
    });
  });
});
