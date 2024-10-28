import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import {
  ApillonApiServerClient,
  Stage,
  TestUser,
  createTestApiKey,
  createTestProject,
  createTestProjectService,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
} from '@apillon/lib';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';

describe('Apillon API RPC service tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let apiServerClient: ApillonApiServerClient;

  let apiKey: ApiKey = undefined;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );

    testProject = await createTestProject(testUser, stage);

    testService = await createTestProjectService(
      stage.context.devConsole,
      testProject,
      AttachedServiceType.RPC,
    );

    apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
    );

    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.RPC,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.RPC,
      }),
    );

    apiServerClient = new ApillonApiServerClient(
      stage.http,
      apiKey.apiKey,
      apiKey.apiKeySecret,
      '/rpc',
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Create RPC API key', () => {
    const rpcApiKeyToCreate = {
      name: 'Test ApiKey',
      description: 'Test descriptions',
    };

    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_api_key');
    });

    test('User should be able to create RPC API key', async () => {
      const response = await apiServerClient.post(
        '/api-key',
        rpcApiKeyToCreate,
      );

      expect(response.status).toBe(201);
      const createdKey = response.body.data;
      expect(createdKey.id).toBeDefined();
      expect(createdKey.name).toBe(rpcApiKeyToCreate.name);
      expect(createdKey.description).toBe(rpcApiKeyToCreate.description);

      const dwellirUser = await stage.db.infrastructure.paramExecute(
        'SELECT dwellir_id FROM dwellir_user WHERE user_uuid = @userUuid',
        { userUuid: testUser.user.user_uuid },
      );
      expect(dwellirUser.length).toBe(1);
      expect(dwellirUser[0].dwellir_id).toBeDefined();
    });
  });

  describe('List API keys', () => {
    let apiKeyId: number;
    const apiKeyToCreate = {
      name: 'Test ApiKey',
      description: 'Test Description',
      uuid: '0000-0000-0000-0000',
    };
    beforeAll(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_api_key (name, description, project_uuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
        {
          ...apiKeyToCreate,
          projectUuid: testProject.project_uuid,
        },
      );
      apiKeyId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });

    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_api_key');
    });

    test('User should be able to list his RPC API keys', async () => {
      const response = await apiServerClient.get('/api-key');

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(1);
      const apiKeys = response.body.data.items;
      expect(apiKeys.length).toBe(1);
      expect(apiKeys[0].id).toBe(apiKeyId);
      expect(apiKeys[0].name).toBe(apiKeyToCreate.name);
      expect(apiKeys[0].description).toBe(apiKeyToCreate.description);
    });

    test('User should be able to filter his RPC API keys', async () => {
      const response = await apiServerClient.get(
        `/api-key?search=${apiKeyToCreate.name}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(1);
      const apiKeys = response.body.data.items;
      expect(apiKeys.length).toBe(1);
      expect(apiKeys[0].name).toBe(apiKeyToCreate.name);

      const response2 = await apiServerClient.get(
        `/api-key?search=${apiKeyToCreate.name}x`,
      );
      expect(response2.status).toBe(200);
      expect(response2.body.data.total).toBe(0);
      const apiKeys2 = response2.body.data.items;
      expect(apiKeys2.length).toBe(0);
    });
  });

  describe('Get API key', () => {
    let apiKeyId: number;
    let urlId: number;
    const apiKeyToCreate = {
      name: 'Test ApiKey',
      description: 'Test Description',
      uuid: '0000-0000-0000-0000',
    };
    const urlToCreate = {
      chain: 'CHAIN',
      network: 'Network',
      apiKeyId: 0,
      httpsUrl: 'https://example.com',
      wssUrl: 'wss://example.com',
    };
    beforeAll(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_api_key (name, description, project_uuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
        {
          ...apiKeyToCreate,
          projectUuid: testProject.project_uuid,
        },
      );
      apiKeyId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;

      urlToCreate.apiKeyId = apiKeyId;

      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_url (chainName, network, apiKeyId,httpsUrl, wssUrl) VALUES (@chain, @network, @apiKeyId, @httpsUrl, @wssUrl)',
        urlToCreate,
      );

      urlId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });

    test('User should be able to get his RPC API Key', async () => {
      const response = await apiServerClient.get(`/api-key/${apiKeyId}`);

      expect(response.status).toBe(200);
      const apiKey = response.body.data;
      expect(apiKey.name).toBe(apiKeyToCreate.name);
      expect(apiKey.description).toBe(apiKeyToCreate.description);
      expect(apiKey.urls.length).toBe(1);
      expect(apiKey.urls[0].id).toBe(urlId);
      expect(apiKey.urls[0].chainName).toBe(urlToCreate.chain);
      expect(apiKey.urls[0].network).toBe(urlToCreate.network);
      expect(apiKey.urls[0].httpsUrl).toBe(urlToCreate.httpsUrl);
      expect(apiKey.urls[0].wssUrl).toBe(urlToCreate.wssUrl);
    });

    test('User should not be able to get RPC API key for other project', async () => {
      const otherProject = await createTestProject(testUser, stage);

      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_api_key (name, description, project_uuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
        {
          ...apiKeyToCreate,
          projectUuid: otherProject.project_uuid,
        },
      );

      const newApiKeyId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;

      const response = await apiServerClient.get(`/api-key/${newApiKeyId}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Get endpoints', () => {
    test('User should be able to get endpoints', async () => {
      const response = await apiServerClient.get('/endpoints');

      expect(response.status).toBe(200);
      const endpoints = response.body.data;
      expect(endpoints.length).toBeGreaterThan(0);
    });
  });
});
