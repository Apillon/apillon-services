import {
  ApiKeyRoleBaseDto,
  DefaultApiKeyRole,
  AttachedServiceType,
  generateJwtToken,
  JwtTokenType,
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

  let token;

  beforeAll(async () => {
    stage = await setupTest();

    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage);
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

  test('Anyone with an api-key can generate a session token', async () => {
    const response = await request(stage.http)
      .get(`/auth/session-token`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
        ).toString('base64')}`,
      );
    expect(response.status).toBe(200);
    token = response.body.data.session;
    expect(token).not.toBeNull();
  });

  test('Invalid token should not be verified', async () => {
    const response = await request(stage.http)
      .post(`/auth/verify-login`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
        ).toString('base64')}`,
      )
      .send({ token });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('INVALID_AUTH_TOKEN');
  });

  test('Valid token should be verified', async () => {
    const email = 'oauthemail@apillon.io';
    const token = generateJwtToken(
      JwtTokenType.OAUTH_TOKEN,
      { email },
      '10min',
    );
    const response = await request(stage.http)
      .post(`/auth/verify-login`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
        ).toString('base64')}`,
      )
      .send({ token });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(email);
  });

  test('Expired token should not be verified', async () => {
    const token2 = generateJwtToken(JwtTokenType.OAUTH_TOKEN, {}, '1');

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await request(stage.http)
      .post(`/auth/verify-login`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
        ).toString('base64')}`,
      )
      .send({ token: token2 });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('INVALID_AUTH_TOKEN');
  });
});
