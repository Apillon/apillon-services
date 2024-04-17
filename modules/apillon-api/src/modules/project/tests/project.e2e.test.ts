import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import {
  Stage,
  TestUser,
  createTestApiKey,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';

import { setupTest } from '../../../../test/helpers/setup';

import { getRequestFactory } from '@apillon/tests-lib/src/lib/helpers/requests';

describe('Project APIs tests', () => {
  let stage: Stage;
  let getRequest;

  let testUser: TestUser;
  let testProject: Project;
  let apiKey: ApiKey = undefined;

  beforeAll(async () => {
    stage = await setupTest();

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.stage.context.access,
    );
    testProject = await createTestProject(testUser, stage, 1000);
    apiKey = await createTestApiKey(
      stage.stage.context.access,
      testProject.project_uuid,
    );
    getRequest = getRequestFactory(stage.http, apiKey);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Project credit tests', () => {
    test('App should be able to get credit of a project', async () => {
      const response = await getRequest(`/project/credit`);

      expect(response.status).toBe(200);
      expect(response.body.data.balance).toBe(1000);
    });
  });
});
