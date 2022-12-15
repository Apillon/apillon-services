import { AmsErrorCode } from '@apillon/access/src/config/types';
import * as request from 'supertest';
import {
  createTestApiKey,
  createTestProject,
} from '../../../../test/helpers/project';
import { createTestProjectService } from '../../../../test/helpers/service';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';
import { Service } from '../../services/models/service.model';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { ApiKeyRole } from '@apillon/access/src/modules/role/models/api-key-role.model';

describe('API key tests', () => {
  let stage: Stage;

  let testUser: TestUser;

  let testProject: Project;
  let testProjectService: Service;

  let apiKey: any;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testProjectService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('User should be able to create new api key for project', async () => {
    const response = await request(stage.http)
      .post('/api-keys')
      .send({
        project_uuid: testProject.project_uuid,
        name: 'My test API key',
        testNetwork: false,
      })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.apiKey).toBeTruthy();
    expect(response.body.data.apiKeySecret).toBeTruthy();

    const ap: ApiKey = await new ApiKey({}, stage.amsContext).populateById(
      response.body.data.id,
    );

    expect(ap.exists()).toBeTruthy();
    expect(ap.name).toBe('My test API key');
    expect(ap.apiKey).toBe(response.body.data.apiKey);
    expect(ap.verifyApiKeySecret(response.body.data.apiKeySecret)).toBeTruthy();

    apiKey = response.body.data;
  });

  test('User should be able to create new api key with roles', async () => {
    const response = await request(stage.http)
      .post('/api-keys')
      .send({
        project_uuid: testProject.project_uuid,
        name: 'My test API key with roles',
        testNetwork: false,
        roles: [
          {
            role_id: 51,
            project_uuid: testProject.project_uuid,
            service_uuid: testProjectService.service_uuid,
          },
        ],
      })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.apiKey).toBeTruthy();
    expect(response.body.data.apiKeySecret).toBeTruthy();

    const ap: ApiKey = await new ApiKey({}, stage.amsContext).populateById(
      response.body.data.id,
    );

    expect(ap.exists()).toBeTruthy();
    //Check APIkey roles
    const apr: ApiKeyRole = await new ApiKeyRole({}, stage.amsContext).populate(
      {
        apiKey_id: response.body.data.id,
        service_uuid: testProjectService.service_uuid,
        project_uuid: testProject.project_uuid,
      },
    );

    expect(await apr.hasRole(51)).toBe(true);
    expect(await apr.hasRole(52)).toBe(false);
  });

  test('User should be able to get list of api keys', async () => {
    const response = await request(stage.http)
      .get(`/api-keys?project_uuid=${testProject.project_uuid}`)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBe(2);
  });

  test('User should be able to assign role to api key', async () => {
    const response = await request(stage.http)
      .post(`/api-keys/${apiKey.id}/role`)
      .send({
        role_id: 51,
        project_uuid: testProject.project_uuid,
        service_uuid: testProjectService.service_uuid,
      })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.role_id).toBe(51);
    expect(response.body.data.serviceType_id).toBe(
      testProjectService.serviceType_id,
    );

    const apr: ApiKeyRole = await new ApiKeyRole({}, stage.amsContext).populate(
      {
        apiKey_id: response.body.data.id,
        service_uuid: testProjectService.service_uuid,
        project_uuid: testProject.project_uuid,
      },
    );
    expect(await apr.hasRole(51)).toBe(true);
  });

  test('User should be able to get api key roles', async () => {
    const response = await request(stage.http)
      .get(`/api-keys/${apiKey.id}/roles`)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
  });

  test('User should be able to delete api key', async () => {
    const response = await request(stage.http)
      .delete(`/api-keys/${apiKey.id}`)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(200);

    const ap: ApiKey = await new ApiKey({}, stage.amsContext).populateById(
      apiKey.id,
    );
    expect(ap.exists()).toBeFalsy();
  });

  test('User should recieve 404 error when key does not exists', async () => {
    const response = await request(stage.http)
      .delete(`/api-keys/5555`)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(404);
    expect(response.body.code).toBe(AmsErrorCode.API_KEY_NOT_FOUND);
    expect(response.body.message).toBe(
      AmsErrorCode[AmsErrorCode.API_KEY_NOT_FOUND],
    );
  });

  describe('API key quotas tests', () => {
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
      //add 20 api keys to quotaTestProject - max api keys on project quota reached
      for (let i = 0; i < 20; i++) {
        await createTestApiKey(stage.amsContext, quotaTestProject.project_uuid);
      }
    });

    test('User should recieve status 400 when max api keys quota is reached', async () => {
      const response = await request(stage.http)
        .post('/api-keys')
        .send({
          project_uuid: quotaTestProject.project_uuid,
          name: 'My test API key',
          testNetwork: false,
        })
        .set('Authorization', `Bearer ${quotaTestsUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        AmsErrorCode[AmsErrorCode.MAX_API_KEY_QUOTA_REACHED],
      );
    });
  });
});
