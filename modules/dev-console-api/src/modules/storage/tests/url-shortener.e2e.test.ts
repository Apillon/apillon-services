import { DefaultUserRole, ShortUrlDto } from '@apillon/lib';
import {
  Stage,
  TestUser,
  createTestBucket,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import * as request from 'supertest';

describe('URL shortener tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );

    testProject = await createTestProject(testUser, stage, 5000, 1);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Generate Short URL', async () => {
    const data = new ShortUrlDto();
    data.targetUrl = 'https://google.com';
    const response = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send(data.serialize())
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
  });
});
