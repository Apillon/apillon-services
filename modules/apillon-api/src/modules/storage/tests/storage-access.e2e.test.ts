import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
} from '@apillon/lib';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
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
import { setupTest } from '../../../../test/helpers/setup';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

describe('Storage access (api keys, api keys permissions, ...) tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let authTestService: Service;
  let testBucket: Bucket;
  let apiKey: ApiKey = undefined;

  let testProject2: Project;
  let testBucket2: Bucket;

  let testFile: File;
  let testFile2: File;

  beforeAll(async () => {
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
      AttachedServiceType.STORAGE,
    );
    authTestService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
      AttachedServiceType.AUTHENTICATION,
    );
    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
    );
    testFile = await createTestBucketFile(stage.storageContext, testBucket);
    apiKey = await createTestApiKey(stage.amsContext, testProject.project_uuid);

    testProject2 = await createTestProject(testUser, stage.devConsoleContext);
    testBucket2 = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject2,
    );
    testFile2 = await createTestBucketFile(stage.storageContext, testBucket2);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Storage Apillon API access tests', () => {
    describe('Api key tests', () => {
      test('Apillon API should return bad request if auth header is not present', async () => {
        const response = await request(stage.http).get(
          `/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`,
        );
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Missing Authorization header');
      });

      test('Apillon API should return unauthorized response code if invalid authorization header is provided', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`)
          .set('Authorization', `Basic i will hack you`);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
          'Missing or invalid Authorization header',
        );
      });

      test('Apillon API should return unauthorized response code if invalid api key / api key secret is provided in auth header', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(apiKey.apiKey + ':' + '123test').toString(
              'base64',
            )}`,
          );
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid API key');
      });
    });
    describe('Api key permissions tests', () => {
      test('Apillon API should return 403 forbidden, if api key is missing required permissions', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          `Insufficient permissins - missing ${
            DefaultApiKeyRole[DefaultApiKeyRole.KEY_READ]
          } permission`,
        );
      });
      test('Apillon API should return 403 forbidden, if api key is missing permissions of specific role', async () => {
        //If we assign KEY_EXECUTE role, Authorization should still fail
        await apiKey.assignRole(
          new ApiKeyRoleBaseDto().populate({
            role_id: DefaultApiKeyRole.KEY_EXECUTE,
            project_uuid: testProject.project_uuid,
            service_uuid: testService.service_uuid,
            serviceType_id: AttachedServiceType.STORAGE,
          }),
        );
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          `Insufficient permissins - missing ${
            DefaultApiKeyRole[DefaultApiKeyRole.KEY_READ]
          } permission`,
        );
      });
      test('Apillon API should return 403 forbidden, if api key is missing permissions of specific serviceType_id', async () => {
        //If we assign KEY_READ role, but for another service_type_id, Authorization should still fail
        await apiKey.assignRole(
          new ApiKeyRoleBaseDto().populate({
            role_id: DefaultApiKeyRole.KEY_READ,
            project_uuid: testProject.project_uuid,
            service_uuid: authTestService.service_uuid,
            serviceType_id: AttachedServiceType.AUTHENTICATION,
          }),
        );
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          `Insufficient permissins - missing ${
            DefaultApiKeyRole[DefaultApiKeyRole.KEY_READ]
          } permission`,
        );
      });
      test('Apillon API should return 200 OK, if API KEY has required permissions', async () => {
        await apiKey.assignRole(
          new ApiKeyRoleBaseDto().populate({
            role_id: DefaultApiKeyRole.KEY_READ,
            project_uuid: testProject.project_uuid,
            service_uuid: testService.service_uuid,
            serviceType_id: AttachedServiceType.STORAGE,
          }),
        );

        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile.id}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(200);
      });
      test('Apillon API should return 403 forbidden, if API addresses resource from another project', async () => {
        const response = await request(stage.http)
          .get(`/storage/${testBucket.bucket_uuid}/file/${testFile2.id}/detail`)
          .set(
            'Authorization',
            `Basic ${Buffer.from(
              apiKey.apiKey + ':' + apiKey.apiKeySecret,
            ).toString('base64')}`,
          );
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          `Insufficient permissions to access this record`,
        );
      });
    });
  });
});
