import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
  SqlModelStatus,
  ValidatorErrorCode,
} from '@apillon/lib';
import {
  FileStatus,
  ObjectType,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { ProjectConfig } from '@apillon/storage/src/modules/config/models/project-config.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { StorageService as StrageMSService } from '@apillon/storage/src/modules/storage/storage.service';
import {
  createTestApiKey,
  createTestBucket,
  createTestBucketFile,
  createTestProject,
  createTestProjectService,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { setupTest } from '../../../../test/helpers/setup';
import { generateJwtSecret } from '@apillon/storage/src/lib/ipfs-utils';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';

describe('Apillon API storage tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let testBucket: Bucket;
  let apiKey: ApiKey = undefined;

  let testUser2: TestUser;
  let testProject2: Project;
  let testService2: Service;

  let apiKey2: ApiKey = undefined;

  let testS3SignedUrl: string = undefined;
  let testS3FileUUID: string = undefined;

  let testFile: File;
  let testFileContent: string;

  beforeAll(async () => {
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage);
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
    testProject2 = await createTestProject(testUser2, stage);
    testService2 = await createTestProjectService(
      stage.devConsoleContext,
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
            files: [
              {
                fileName: 'myTestFile.txt',
                contentType: 'text/plain',
              },
            ],
          })
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(201);
        expect(response.body.data.files.length).toBe(1);
        expect(response.body.data.files[0].url).toBeTruthy();
        expect(response.body.data.files[0].fileUuid).toBeTruthy();

        testS3SignedUrl = response.body.data.files[0].url;
        testS3FileUUID = response.body.data.files[0].fileUuid;
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
          .send({
            files: [{}],
          })
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
            (x) => x.code == StorageErrorCode.FILE_NAME_NOT_PRESENT,
          ),
        ).toBeTruthy();
        expect(
          response.body.errors.filter(
            (x) => x.code == StorageErrorCode.BUCKET_PROJECT_UUID_NOT_PRESENT,
          ),
        ).toBeTruthy();
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
            (x) => x.code == ValidatorErrorCode.FILES_PROPERTY_NOT_PRESENT,
          ),
        ).toBeTruthy();
      });

      test('Application should NOT be able to recieve S3 signed URL for ANOTHER USER project', async () => {
        const response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/upload`)
          .send({
            files: [
              {
                fileName: 'myTestFile.txt',
                contentType: 'text/plain',
              },
            ],
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

        const ipfsCluster = await new ProjectConfig(
          { project_uuid: testFile.project_uuid },
          stage.storageContext,
        ).getIpfsCluster();

        const response = await request(
          ipfsCluster.generateLink(testFile.project_uuid, testFile.CID),
        ).get('');
        expect(response.status).toBe(200);
        expect(response.text).toBe(testFileContent);
      });
    });

    describe('File details & list files tests', () => {
      test('Application should be able to get file details by fileUuid', async () => {
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

        expect(response.body.data.fileStatus).toBe(FileStatus.UPLOADED_TO_IPFS);
        expect(response.body.data.fileUuid).toBe(testFile.file_uuid);
        expect(response.body.data.CID).toBe(testFile.CID);
        expect(response.body.data.name).toBe(testFile.name);
        expect(response.body.data.size).toBeGreaterThan(0);
        expect(response.body.data.link).toBeTruthy();
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

        expect(response.body.data.fileStatus).toBe(FileStatus.UPLOADED_TO_IPFS);
        expect(response.body.data.fileUuid).toBe(testFile.file_uuid);
        expect(response.body.data.CID).toBe(testFile.CID);
        expect(response.body.data.name).toBe(testFile.name);
        expect(response.body.data.size).toBeGreaterThan(0);
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

      test('Application should be able to get content in bucket', async () => {
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
        expect(response.body.data.items[0].type).toBe(ObjectType.FILE);
        expect(response.body.data.items[0].CID).toBeTruthy();
        expect(response.body.data.items[0].uuid).toBeTruthy();
        expect(response.body.data.items[0].name).toBeTruthy();
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

      test('Application should be able to list files in bucket', async () => {
        const response = await request(stage.http)
          .get(`/storage/buckets/${testBucket.bucket_uuid}/files`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);

        expect(response.body.data.total).toBe(1);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0].CID).toBeTruthy();
        expect(response.body.data.items[0].CIDv1).toBeTruthy();
        expect(response.body.data.items[0].fileUuid).toBeTruthy();
        expect(response.body.data.items[0].name).toBeTruthy();
        expect(response.body.data.items[0].createTime).toBeTruthy();
        expect(response.body.data.items[0].updateTime).toBeTruthy();
        expect(response.body.data.items[0].size).toBeTruthy();
        expect(response.body.data.items[0].fileStatus).toBeTruthy();
      });
    });

    describe('Delete file and directory tests', () => {
      test('Application should NOT be able to delete ANOTHER application uploaded file', async () => {
        expect(testFile).toBeTruthy();
        const response = await request(stage.http)
          .delete(
            `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}`,
          )
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
          .delete(
            `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}`,
          )
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);
        testFile = await new File({}, stage.storageContext).populateById(
          testFile.file_uuid,
        );
        expect(testFile.exists()).toBeFalsy();
      });

      test('Application should be able to delete directory', async () => {
        const testDirectory: Directory = await new Directory(
          {},
          stage.storageContext,
        )
          .fake()
          .populate({
            project_uuid: testProject.project_uuid,
            bucket_id: testBucket.id,
            name: 'Test directory',
          })
          .insert();

        //Add files
        const testDirectoryFile = await createTestBucketFile(
          stage.storageContext,
          testBucket,
          'xyz.txt',
          'text/plain',
          true,
          testDirectory.id,
        );

        const response = await request(stage.http)
          .delete(
            `/storage/buckets/${testBucket.bucket_uuid}/directories/${testDirectory.directory_uuid}`,
          )
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);

        const d = await new Directory({}, stage.storageContext).populateById(
          testDirectory.id,
        );
        expect(d.exists()).toBeFalsy();

        const f = await new File({}, stage.storageContext).populateById(
          testDirectoryFile.id,
        );
        expect(f.exists()).toBeFalsy();
      });
    });

    describe('Single upload request, for multiple files', () => {
      test('User should be able to recieve multiple s3 urls for upload', async () => {
        const testSession_uuid = uuidV4();

        //Get urls for upload
        let response = await request(stage.http)
          .post(`/storage/${testBucket.bucket_uuid}/upload`)
          .send({
            sessionUuid: testSession_uuid,
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
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );

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
            `/storage/${testBucket.bucket_uuid}/upload/${testSession_uuid}/end`,
          )
          .send({
            directSync: true,
          })
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);

        //Check if files exists
        let file: File = await new File(
          {},
          stage.storageContext,
        ).populateByUUID(abcdUrlResponse.fileUuid);

        expect(file.exists()).toBeTruthy();
        file = await new File({}, stage.storageContext).populateByUUID(
          abcdUrlResponse.fileUuid,
        );
        expect(file.exists()).toBeTruthy();
      });
    });

    describe('Tests for storage info endpoints (info, cluster info, ipfs-link)', () => {
      test('Application should be able to get storage info', async () => {
        const response = await request(stage.http)
          .get(`/storage/info`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);
        expect(response.body.data.availableStorage).toBeGreaterThan(0);
        expect(response.body.data.usedStorage).toBeGreaterThan(0);
        expect(response.body.data.availableBandwidth).toBeGreaterThan(0);
      });

      test('Application should be able to get ipfs cluster info', async () => {
        const ipfsCluster = await new ProjectConfig(
          { project_uuid: apiKey.project_uuid },
          stage.storageContext,
        ).getIpfsCluster();

        const response = await request(stage.http)
          .get(`/storage/ipfs-cluster-info`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );

        expect(response.status).toBe(200);
        expect(response.body.data.secret).toBe(
          generateJwtSecret(apiKey.project_uuid, ipfsCluster.secret),
        );
        expect(response.body.data.projectUuid).toBe(apiKey.project_uuid);
        expect(response.body.data.ipfsGateway).toBe(
          ipfsCluster.subdomainGateway
            ? `https://<CIDv1>.${ipfsCluster.subdomainGateway}`
            : ipfsCluster.ipfsGateway,
        );
        expect(response.body.data.ipnsGateway).toBe(
          ipfsCluster.subdomainGateway
            ? `https://<IPNS>.${ipfsCluster.subdomainGateway}`
            : ipfsCluster.ipnsGateway,
        );
      });

      test('Application should be able to get link on ipfs for CID', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/link-on-ipfs/k2k4r8plzxzg7eji9ucbr1trn9teesc72h1odfsjjggf4nmmm6rjosiu`,
          )
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);
        expect(response.body.data.link).toBeTruthy();
        expect(response.body.data.link).toMatch(
          'k2k4r8plzxzg7eji9ucbr1trn9teesc72h1odfsjjggf4nmmm6rjosiu',
        );
        expect(response.body.data.link).toMatch('ipfs');
      });

      test('Application should be able to get link on ipfs for IPNS', async () => {
        const response = await request(stage.http)
          .get(
            `/storage/link-on-ipfs/k2k4r8lqt07ls9uyz141ofqcl99k4b8e63ns1fh52ib1bwh09z0k6vjk`,
          )
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);
        expect(response.body.data.link).toBeTruthy();
        expect(response.body.data.link).toMatch(
          'k2k4r8lqt07ls9uyz141ofqcl99k4b8e63ns1fh52ib1bwh09z0k6vjk',
        );
        expect(response.body.data.link).toMatch('ipns');
      });
    });
  });
});
