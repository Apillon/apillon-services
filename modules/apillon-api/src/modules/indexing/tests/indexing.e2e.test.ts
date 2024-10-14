import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Subscription } from '@apillon/config/src/modules/subscription/models/subscription.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { InfrastructureErrorCode } from '@apillon/infrastructure/src/config/types';
import { Indexer } from '@apillon/infrastructure/src/modules/indexer/models/indexer.model';
import {
  AttachedServiceType,
  DefaultUserRole,
  SqlModelStatus,
} from '@apillon/lib';
import {
  Stage,
  TestUser,
  createTestApiKey,
  createTestProject,
  createTestUser,
  getConfig,
  getRequestFactory,
  postRequestFactory,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { setupTest } from '../../../../test/helpers/setup';

describe('Indexing tests', () => {
  let stage: Stage;
  let config: any;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let apiKey: ApiKey = undefined;

  let testProject2: Project;
  let apiKey2: ApiKey = undefined;

  let testIndexer: Indexer;

  let getRequest, postRequest;
  let getRequest2, postRequest2;

  beforeAll(async () => {
    stage = await setupTest();
    config = await getConfig();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );
    testProject = await createTestProject(testUser, stage);

    apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
      'test-service-1',
      AttachedServiceType.INDEXING,
    );

    testIndexer = await new Indexer({}, stage.context.infrastructure)
      .populate({
        indexer_uuid: uuidV4(),
        project_uuid: testProject.project_uuid,
        name: 'Test indexer',
        description: 'Test indexer description',
      })
      .insert();

    //Project 2
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject2 = await createTestProject(testUser2, stage);

    apiKey2 = await createTestApiKey(
      stage.context.access,
      testProject2.project_uuid,
      'test-service-1',
      AttachedServiceType.INDEXING,
    );

    getRequest = getRequestFactory(stage.http, apiKey);
    postRequest = postRequestFactory(stage.http, apiKey);
    getRequest2 = getRequestFactory(stage.http, apiKey2);
    postRequest2 = postRequestFactory(stage.http, apiKey2);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Tests for source code upload & deployment', () => {
    test('Application (through Apillon API) should be able to get url for indexer source code upload', async () => {
      const response = await getRequest(
        `/indexing/indexer/${testIndexer.indexer_uuid}/url-for-source-code-upload`,
      );
      expect(response.status).toBe(200);
      expect(response.body.data).toBeTruthy();

      //Upload test indexer source code to s3 bucket
      if (config.indexing.indexerSourceCodePath) {
        const s3Response = await request(response.body.data)
          .put(``)
          .send(
            require('fs').readFileSync(config.indexing.indexerSourceCodePath),
          )
          .set('Content-Type', 'application/gzip');
        expect(s3Response.status).toBe(200);
      }
    });

    test('Application (through Apillon API) should NOT be able to get url for another project indexer source code upload', async () => {
      const response = await getRequest2(
        `/indexing/indexer/${testIndexer.indexer_uuid}/url-for-source-code-upload`,
      );
      expect(response.status).toBe(403);
    });

    test('Application (through Apillon API) should NOT be able to deploy ANOTHER project indexer', async () => {
      const response = await postRequest2(
        `/indexing/indexer/${testIndexer.indexer_uuid}/deploy`,
      );
      expect(response.status).toBe(403);
    });

    test('Application (through Apillon API) should NOT be able to deploy indexer of project, without subscription', async () => {
      const response = await postRequest(
        `/indexing/indexer/${testIndexer.indexer_uuid}/deploy`,
      );
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(
        InfrastructureErrorCode.PROJECT_HAS_NO_SUBSCRIPTION,
      );
    });

    describe('Tests for indexer deployment of project which has subscription', () => {
      beforeAll(async () => {
        //Add subscription to project
        await new Subscription(
          {
            package_id: 1,
            project_uuid: testProject.project_uuid,
            expiresOn: new Date(2050, 1, 1),
            subscriberEmail: 'subscriber@gmail.com',
            stripeId: 1,
          },
          stage.context.config,
        ).insert();
      });
      test('Application (through Apillon API) should be able to deploy indexer', async () => {
        const response = await postRequest(
          `/indexing/indexer/${testIndexer.indexer_uuid}/deploy`,
        );
        expect(response.status).toBe(200);

        //Check that indexer has been deployed
        const indexer = await new Indexer(
          {},
          stage.context.infrastructure,
        ).populateByUUID(testIndexer.indexer_uuid);

        expect(indexer.status).toBe(SqlModelStatus.ACTIVE);
        expect(indexer.lastDeploymentId).toBeTruthy();
      });

      test('Application (through Apillon API) should receive error if indexer is not uploaded to s3', async () => {
        const testIndexer2 = await new Indexer({}, stage.context.infrastructure)
          .populate({
            indexer_uuid: uuidV4(),
            project_uuid: testProject.project_uuid,
            name: 'Test indexer 2',
            description: 'Test indexer 2 description',
          })
          .insert();

        const response = await postRequest(
          `/indexing/indexer/${testIndexer2.indexer_uuid}/deploy`,
        );
        expect(response.status).toBe(400);
        expect(response.body.code).toBe(
          InfrastructureErrorCode.INDEXER_SOURCE_CODE_NOT_FOUND,
        );
      });

      test.only('Application (through Apillon API) should receive error if indexer source code is not in gzip format', async () => {
        const testIndexer2 = await new Indexer({}, stage.context.infrastructure)
          .populate({
            indexer_uuid: uuidV4(),
            project_uuid: testProject.project_uuid,
            name: 'Test indexer 2',
            description: 'Test indexer 2 description',
          })
          .insert();

        const response = await getRequest(
          `/indexing/indexer/${testIndexer2.indexer_uuid}/url-for-source-code-upload`,
        );
        expect(response.status).toBe(200);
        expect(response.body.data).toBeTruthy();

        //Upload some invalid file/data
        const s3Response = await request(response.body.data)
          .put(``)
          .send('some invalid data');
        expect(s3Response.status).toBe(200);

        const deployResponse = await postRequest(
          `/indexing/indexer/${testIndexer2.indexer_uuid}/deploy`,
        );
        expect(deployResponse.status).toBe(400);
        expect(deployResponse.body.code).toBe(
          InfrastructureErrorCode.INDEXER_SOURCE_CODE_INVALID_FORMAT,
        );
      });
    });
  });
});
