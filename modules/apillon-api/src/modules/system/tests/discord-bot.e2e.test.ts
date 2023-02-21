import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { OauthLinkType, SqlModelStatus } from '@apillon/lib';
import {
  releaseStage,
  Stage,
  generateSystemApiKey,
  TestUser,
  createTestProject,
  createTestUser,
  createTestApiKey,
} from '@apillon/tests-lib';

import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

describe('Discord bot APIs', () => {
  let stage: Stage;

  let apiKey: ApiKey = undefined;
  let systemApiKey: ApiKey = undefined;
  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;
  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser3 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage.devConsoleContext);

    await stage.amsContext.mysql.paramExecute(`
    INSERT INTO oauthLink (authUser_id, type, status, externalUserId, externalUsername)
    VALUES 
    (${testUser.authUser.id}, ${OauthLinkType.DISCORD}, ${SqlModelStatus.ACTIVE}, '1', '${testUser.user.name}'),
    (${testUser2.authUser.id}, ${OauthLinkType.DISCORD}, ${SqlModelStatus.ACTIVE}, '2', '${testUser2.user.name}'),
    (${testUser3.authUser.id}, ${OauthLinkType.DISCORD}, ${SqlModelStatus.ACTIVE}, '3', '${testUser3.user.name}')
    ;
    `);

    apiKey = await createTestApiKey(stage.amsContext, testProject.project_uuid);

    systemApiKey = await generateSystemApiKey(stage.amsContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('API should not be accessible without api key', async () => {
    const response = await request(stage.http).get(`/discord-bot/user-list`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing Authorization header');
  });

  test('User api key should not work for discord bot api', async () => {
    const response = await request(stage.http)
      .get(`/discord-bot/user-list`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          apiKey.apiKey + ':' + apiKey.apiKeySecret,
        ).toString('base64')}`,
      );
    expect(response.status).toBe(403);
  });

  test('Discord bot should be able to access data from endpoint with system api key', async () => {
    const response = await request(stage.http)
      .get(`/discord-bot/user-list`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          systemApiKey.apiKey + ':' + systemApiKey.apiKeySecret,
        ).toString('base64')}`,
      );
    expect(response.status).toBe(200);
    expect(response.body.data.data.length).toBe(3);
  });
});
