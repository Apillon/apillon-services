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
  getRequestFactory,
  postRequestFactory,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';

describe('Apillon API social tests', () => {
  let stage: Stage;
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

  beforeAll(async () => {
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
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );

    //insert test space
    testSpace = await new Space({}, stage.socialContext)
      .fake()
      .populate({
        status: SqlModelStatus.DRAFT,
        project_uuid: testProject.project_uuid,
        about: 'Test space',
      })
      .insert();

    //Insert test post
    testPost = await new Post({}, stage.socialContext)
      .fake()
      .populate({
        space_id: testSpace.id,
        status: SqlModelStatus.DRAFT,
        project_uuid: testProject.project_uuid,
      })
      .insert();

    await new Wallet(
      {
        chain: SubstrateChain.SUBSOCIAL,
        chainType: ChainType.SUBSTRATE,
        seed: 'disorder reveal crumble deer axis slush unique answer catalog junk hazard damp',
        address: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
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
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Apillon API social Space tests', () => {
    test('Application (through Apillon API) should be able to should be able to list spaces(hubs)', async () => {
      const response = await getRequest(`/social/hubs`);

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.space_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.status).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.about).toBeTruthy();
    });
  });
});
