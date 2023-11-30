import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
  DefaultUserRole,
} from '@apillon/lib';
import { BucketType } from '@apillon/storage/src/config/types';
import { addJwtToIPFSUrl } from '@apillon/storage/src/lib/ipfs-utils';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { ProjectConfig } from '@apillon/storage/src/modules/config/models/project-config.model';
import { Ipns } from '@apillon/storage/src/modules/ipns/models/ipns.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import {
  Stage,
  TestUser,
  createTestApiKey,
  createTestBucket,
  createTestBucketFile,
  createTestProject,
  createTestProjectService,
  createTestUser,
  getRequestFactory,
  postRequestFactory,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

describe('Ipns tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let testService: Service;
  let testProject2: Project;
  let apiKey: ApiKey = undefined;

  let testBucket: Bucket;
  let testBucket2: Bucket;

  let ipnsRecord: any;

  let getRequest, postRequest;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );
    testProject = await createTestProject(testUser, stage);
    testService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );
    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
      BucketType.STORAGE,
    );

    ipnsRecord = await new Ipns({}, stage.storageContext)
      .fake()
      .populate({
        project_uuid: testProject.project_uuid,
        bucket_id: testBucket.id,
      })
      .insert();

    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject2 = await createTestProject(testUser2, stage);
    testBucket2 = await createTestBucket(
      testUser2,
      stage.storageContext,
      testProject2,
      BucketType.STORAGE,
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

    getRequest = getRequestFactory(stage.http, apiKey);
    postRequest = postRequestFactory(stage.http, apiKey);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('IPNS CRU tests', () => {
    test('Application (through Apillon API) should be able to list ipns records inside bucket', async () => {
      const response = await getRequest(
        `/storage/buckets/${testBucket.bucket_uuid}/ipns`,
      );
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].name).toBeTruthy();
    });

    test('Application (through Apillon API) should recieve 422 if invalid body', async () => {
      const response = await postRequest(
        `/storage/buckets/${testBucket.bucket_uuid}/ipns`,
      );
      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBe(1);
      expect(response.body.errors.find((x) => x.code == 42200026)).toBeTruthy();
    });

    test('Application (through Apillon API) should be able to create IPNS record', async () => {
      const response = await postRequest(
        `/storage/buckets/${testBucket.bucket_uuid}/ipns`,
        { name: 'My new IPNS' },
      );
      expect(response.status).toBe(201);
      expect(response.body.data.ipnsUuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();

      const newIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateByUUID(response.body.data.ipnsUuid);
      expect(newIpns.exists()).toBeTruthy();
    });

    test('Application (through Apillon API) should be able to update IPNS record', async () => {
      const response = await request(stage.http)
        .patch(
          `/storage/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecord.ipns_uuid}`,
        )
        .send({
          name: 'My updated IPNS record',
          description: 'This is new description',
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);
      expect(response.body.data.ipnsUuid).toBeTruthy();
      expect(response.body.data.name).toBe('My updated IPNS record');
      const updatedIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateByUUID(ipnsRecord.ipns_uuid);
      expect(updatedIpns.exists()).toBeTruthy();
    });
  });

  describe('IPNS Access tests', () => {
    let ipnsRecordToDelete: Ipns;
    beforeAll(async () => {
      ipnsRecordToDelete = await new Ipns({}, stage.storageContext)
        .fake()
        .populate({
          project_uuid: testProject2.project_uuid,
          bucket_id: testBucket2.id,
          name: 'My test IPNS for IPNS Access tests',
        })
        .insert();
    });
    test('Application (through Apillon API) should NOT be able to delete ANOTHER project IPNS record', async () => {
      const response = await request(stage.http)
        .delete(
          `/storage/buckets/${testBucket2.bucket_uuid}/ipns/${ipnsRecordToDelete.ipns_uuid}`,
        )
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );

      const tmpIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateByUUID(ipnsRecordToDelete.ipns_uuid);
      expect(tmpIpns.exists()).toBeTruthy();
    });

    test('Application (through Apillon API) should NOT be able to list ipns records inside ANOTHER bucket', async () => {
      const response = await getRequest(
        `/storage/buckets/${testBucket2.bucket_uuid}/ipns`,
      );
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to access this record',
      );
    });

    test('Application (through Apillon API) should NOT be able to create IPNS record for ANOTHER bucket', async () => {
      const response = await postRequest(
        `/storage/buckets/${testBucket2.bucket_uuid}/ipns`,
        { name: 'My new IPNS' },
      );
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );
    });
  });

  describe('Publish IPNS tests', () => {
    let file: File;
    let publishedIpnsName: string;
    beforeAll(async () => {
      //Create new file & CID
      file = await createTestBucketFile(
        stage.storageContext,
        testBucket,
        'Test file on IPFS.txt',
        'text/plain',
        true,
      );
    });

    test('Application (through Apillon API) should recieve 422 unprocessable entity status, if passing invalid body', async () => {
      const response = await postRequest(
        `/storage/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecord.ipns_uuid}/publish`,
      );
      expect(response.status).toBe(422);
      expect(response.body.errors).toBeTruthy();
    });
    test('Application (through Apillon API) should be able to publish CID to IPNS', async () => {
      const response = await postRequest(
        `/storage/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecord.ipns_uuid}/publish`,
        { cid: file.CID },
      );
      expect(response.status).toBe(200);
      expect(response.body.data.ipnsUuid).toBeTruthy();

      const publishedIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateByUUID(response.body.data.ipnsUuid);
      expect(publishedIpns.exists()).toBeTruthy();
      expect(publishedIpns.ipnsName).toBeTruthy();
      expect(publishedIpns.ipnsValue).toBeTruthy();

      publishedIpnsName = publishedIpns.ipnsName;
    });

    test('Application (through Apillon API) should be able to download file from apillon ipns gateway', async () => {
      const ipfsCluster = await new ProjectConfig(
        { project_uuid: ipnsRecord.project_uuid },
        stage.storageContext,
      ).getIpfsCluster();

      expect(publishedIpnsName).toBeTruthy();
      const response = await request(
        addJwtToIPFSUrl(
          ipfsCluster.ipnsGateway + publishedIpnsName,
          testProject.project_uuid,
          publishedIpnsName,
          ipfsCluster,
        ),
      ).get('');
      expect(response.status).toBe(200);
    });
  });

  describe('IPNS delete tests', () => {
    let ipnsRecordToDelete: Ipns;
    beforeAll(async () => {
      ipnsRecordToDelete = await new Ipns({}, stage.storageContext)
        .fake()
        .populate({
          name: 'ipns to delete',
          project_uuid: testProject.project_uuid,
          bucket_id: testBucket.id,
        })
        .insert();
    });

    test('Application (through Apillon API) should be able to delete IPNS record', async () => {
      const response = await request(stage.http)
        .delete(
          `/storage/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecordToDelete.ipns_uuid}`,
        )
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      const tmpIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateByUUID(ipnsRecordToDelete.ipns_uuid);
      expect(tmpIpns.exists()).toBeFalsy();
    });
  });
});
