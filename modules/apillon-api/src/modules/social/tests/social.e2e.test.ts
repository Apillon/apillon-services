import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  ChainType,
  DefaultApiKeyRole,
  SqlModelStatus,
  SubstrateChain,
} from '@apillon/lib';
import { Post } from '@apillon/social/src/modules/subsocial/models/post.model';
import { Space } from '@apillon/social/src/modules/subsocial/models/space.model';
import {
  Stage,
  TestUser,
  createTestApiKey,
  createTestProject,
  createTestProjectService,
  createTestUser,
  getConfig,
  getRequestFactory,
  postRequestFactory,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';

describe('Apillon API social tests', () => {
  let stage: Stage;
  let config: any;
  let getRequest, postRequest;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let apiKey: ApiKey = undefined;

  let testUser2: TestUser;
  let testProject2: Project;
  let testService2: Service;

  let apiKey2: ApiKey = undefined;

  let testSpace: Space;
  let testPost: Post;
  let defaultSpace: Space;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage, 1200, 2);
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
        serviceType_id: AttachedServiceType.SOCIAL,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.SOCIAL,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.SOCIAL,
      }),
    );

    //insert test space
    testSpace = await new Space({}, stage.socialContext)
      .fake()
      .populate({
        status: SqlModelStatus.ACTIVE,
        project_uuid: testProject.project_uuid,
        about: 'Test space',
        spaceId: 111,
      })
      .insert();

    //insert default (apillon) space
    defaultSpace = await new Space({}, stage.socialContext)
      .fake()
      .populate({
        space_uuid: '109ec07b-cfd5-486f-ac9e-831ef0d6ec6f',
        status: SqlModelStatus.ACTIVE,
        project_uuid: 'Integration project uuid',
        about: 'Default space',
        spaceId: 123,
        walletAddress: config.subsocial.wallet.address,
      })
      .insert();

    //Insert test post
    testPost = await new Post({}, stage.socialContext)
      .fake()
      .populate({
        space_id: testSpace.id,
        status: SqlModelStatus.ACTIVE,
        project_uuid: testProject.project_uuid,
        postId: 222,
      })
      .insert();

    await new Wallet(
      {
        ...config.subsocial.wallet,
        chain: config.subsocial.chain,
        chainType: config.subsocial.chainType,
        nextNonce: 1,
      },
      stage.blockchainContext,
    ).insert();

    getRequest = getRequestFactory(stage.http, apiKey);
    postRequest = postRequestFactory(stage.http, apiKey);

    //User 2 project & other data
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject2 = await createTestProject(testUser2, stage, 1200, 2);
    testService2 = await createTestProjectService(
      stage.devConsoleContext,
      testProject2,
    );

    apiKey2 = await createTestApiKey(
      stage.amsContext,
      testProject2.project_uuid,
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.SOCIAL,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.SOCIAL,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.SOCIAL,
      }),
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Apillon API social Space tests', () => {
    test('Application (through Apillon API) should be able to list spaces(hubs)', async () => {
      const response = await getRequest(`/social/hubs`);

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      const listedSpace = response.body.data.items[0];
      expect(listedSpace.hubUuid).toBe(testSpace.space_uuid);
      expect(listedSpace.status).toBe(5);
      expect(listedSpace.name).toBe(testSpace.name);
      expect(listedSpace.about).toBe(testSpace.about);
      expect(listedSpace.hubId).toBe(testSpace.spaceId);
    });

    test('Application (through Apillon API) should be able to get space(hub)', async () => {
      const response = await getRequest(`/social/hubs/${testSpace.space_uuid}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hubUuid).toBe(testSpace.space_uuid);
      expect(response.body.data.status).toBe(5);
      expect(response.body.data.name).toBe(testSpace.name);
      expect(response.body.data.about).toBe(testSpace.about);
      expect(response.body.data.hubId).toBe(testSpace.spaceId);
    });

    test('Application (through Apillon API) should NOT be able to get space(hub) of another project', async () => {
      const response = await request(stage.http)
        .get(`/social/hubs/${testSpace.space_uuid}`)
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
          ).toString('base64')}`,
        );

      expect(response.status).toBe(403);
    });

    test('Application (through Apillon API) should be able to create new space(hub)', async () => {
      const response = await postRequest(`/social/hubs`, {
        name: 'My test space',
        about: 'My test space description',
      });
      expect(response.status).toBe(201);
      expect(response.body.data.hubUuid).toBeTruthy();
      expect(response.body.data.status).toBe(1);
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.about).toBeTruthy();
    });
  });

  describe('Apillon API social Post(channel) tests', () => {
    test('Application (through Apillon API) should be able to list channels', async () => {
      const response = await getRequest(`/social/channels`);

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      const listedPost = response.body.data.items[0];
      expect(listedPost.channelUuid).toBe(testPost.post_uuid);
      expect(listedPost.status).toBe(5);
      expect(listedPost.title).toBe(testPost.title);
      expect(listedPost.body).toBe(testPost.body);
      expect(listedPost.channelId).toBe(testPost.postId);
    });

    test('Application (through Apillon API) should be able to get channel(post)', async () => {
      const response = await getRequest(
        `/social/channels/${testPost.post_uuid}`,
      );

      expect(response.body.data.channelUuid).toBe(testPost.post_uuid);
      expect(response.body.data.status).toBe(5);
      expect(response.body.data.title).toBe(testPost.title);
      expect(response.body.data.body).toBe(testPost.body);
      expect(response.body.data.channelId).toBe(testPost.postId);
    });

    test('Application (through Apillon API) should NOT be able to get channel(post) of another project', async () => {
      const response = await request(stage.http)
        .get(`/social/channels/${testPost.post_uuid}`)
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
          ).toString('base64')}`,
        );

      expect(response.status).toBe(403);
    });

    test('Application (through Apillon API) should be able to create new post(channel)', async () => {
      const response = await postRequest(`/social/channels`, {
        projectUuid: testProject.project_uuid,
        hubUuid: testSpace.space_uuid,
        title: 'My test channel',
        body: 'This is channel description',
      });
      expect(response.status).toBe(201);
      expect(response.body.data.channelUuid).toBeTruthy();
      expect(response.body.data.status).toBe(1);
      expect(response.body.data.title).toBeTruthy();
      expect(response.body.data.body).toBeTruthy();

      const tmpChannel = await new Post({}, stage.socialContext).populateByUUID(
        response.body.data.channelUuid,
        'post_uuid',
      );
      expect(tmpChannel.exists).toBeTruthy();
      expect(tmpChannel.space_id).toBe(testSpace.id);
    });

    test('Application (through Apillon API) should be able to create new post(channel) in DEFAULT hub', async () => {
      const response = await postRequest(`/social/channels`, {
        projectUuid: testProject.project_uuid,
        title: 'My test channel',
        body: 'This is channel description',
      });
      expect(response.status).toBe(201);
      expect(response.body.data.channelUuid).toBeTruthy();
      expect(response.body.data.status).toBe(1);
      expect(response.body.data.title).toBeTruthy();
      expect(response.body.data.body).toBeTruthy();

      const tmpChannel = await new Post({}, stage.socialContext).populateByUUID(
        response.body.data.channelUuid,
        'post_uuid',
      );
      expect(tmpChannel.exists).toBeTruthy();
      expect(tmpChannel.space_id).toBe(defaultSpace.id);
    });
  });
});
