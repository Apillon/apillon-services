import {
  ApiKeyRoleBaseDto,
  DefaultApiKeyRole,
  AttachedServiceType,
} from '@apillon/lib';
import {
  Stage,
  releaseStage,
  createTestUser,
  createTestApiKey,
  createTestProject,
  createTestProjectService,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';

describe('Authentication tests', () => {
  let stage: Stage;
  let testUser;
  let apiKey;
  let testProject;
  let testService;

  beforeAll(async () => {
    stage = await setupTest();

    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );

    apiKey = await createTestApiKey(stage.amsContext, testProject.project_uuid);
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.AUTHENTICATION,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.AUTHENTICATION,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.AUTHENTICATION,
      }),
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Anyone with an api-key can generate a session token ', async () => {
    const response = await request(stage.http)
      .get(`/auth/session-token`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          apiKey.apiKey + ':' + apiKey.apiKeySecret,
        ).toString('base64')}`,
      );
    expect(response.status).toBe(200);
    const token = response.body.data.session;
    expect(token).not.toBeNull();
  });
});
