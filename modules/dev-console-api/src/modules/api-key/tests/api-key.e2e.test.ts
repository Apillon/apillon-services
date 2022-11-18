import { AmsErrorCode } from '@apillon/access/src/config/types';
import * as request from 'supertest';
import { createTestProject } from '../../../../test/helpers/project';
import { createTestProjectService } from '../../../../test/helpers/service';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';
import { Service } from '../../services/models/service.model';

describe('API key tests', () => {
  let stage: Stage;

  let testUser: TestUser;

  let testProject: Project;
  let testProjectService: Service;

  let apiKey: any;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(
      testUser,
      stage.devConsoleContext,
      stage.amsContext,
    );
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

    apiKey = response.body.data;
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
});
