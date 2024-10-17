import {
  CreateRpcUrlDto,
  DefaultUserRole,
  ListRpcUrlsForApiKeyQueryFilter,
  SqlModelStatus,
} from '@apillon/lib';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import { DbTables } from '../../../config/types';
import { RpcUrlService } from '../rpc-url.service';
describe('RPC Url tests', () => {
  const projectUuid = 'uuid';
  let stage: Stage;
  let apiKeyId: number;
  beforeAll(async () => {
    stage = await setupTest();
    stage.context.user = {
      userRoles: [DefaultUserRole.PROJECT_ADMIN],
      authUser: {
        authUserRoles: [
          {
            project_uuid: projectUuid,
            role: {
              id: DefaultUserRole.PROJECT_ADMIN,
            },
          },
        ],
      },
    };
    await stage.db.paramExecute(
      `INSERT INTO ${DbTables.RPC_API_KEY} (name, project_uuid, uuid, status)
              VALUES ('RPC ENV', '${projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
    );
    const result = await stage.db.paramExecute(`SELECT LAST_INSERT_ID() as id`);
    const createdApiKeyId = result?.[0]?.id;
    if (!createdApiKeyId) {
      throw new Error('ApiKey not created');
    }
    apiKeyId = createdApiKeyId;
  });
  afterAll(async () => {
    await releaseStage(stage);
  });
  describe('createRpcUrl', () => {
    test('User can create a new rpc url', async () => {
      const dto = new CreateRpcUrlDto({
        chainName: 'Subsocial',
        network: 'Mainnet',
        apiKeyId,
      });
      const createdRpcUrlResponse = await RpcUrlService.createRpcUrl(
        { data: dto },
        stage.context,
      );
      expect(createdRpcUrlResponse).toBeDefined();
      expect(createdRpcUrlResponse.id).toBeDefined();
      expect(createdRpcUrlResponse.chainName).toBe(dto.chainName);
      expect(createdRpcUrlResponse.network).toBe(dto.network);
      expect(createdRpcUrlResponse.httpsUrl).toBeDefined();
      expect(createdRpcUrlResponse.wssUrl).toBeDefined();
      expect(createdRpcUrlResponse.createTime).toBeDefined();
    });
    test('User cannot create rpc url on the same network and apiKey', async () => {
      const network = 'NETWORK';
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_URL} (apiKeyId, chainName,network,httpsUrl, wssUrl)
                    VALUES (${apiKeyId}, 'Chain',@network, '','')`,
        { network },
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdRpcUrlId = result?.[0]?.id;
      if (!createdRpcUrlId) {
        throw new Error('Rpc Url not created');
      }
      const dto = new CreateRpcUrlDto({
        chainName: 'Test Chain',
        network,
        apiKeyId,
      });
      const createdRpcUrlResponse = await RpcUrlService.createRpcUrl(
        {
          data: dto,
        },
        stage.context,
      );
      expect(createdRpcUrlResponse).toBeDefined();
      expect(createdRpcUrlResponse.id).toBe(createdRpcUrlId);
    });
  });
  describe('deleteRpcUrl', () => {
    test('User can delete a Rpc url', async () => {
      const dto = {
        chainName: 'chain',
        network: 'network2',
        httpsUrl: 'https://example.com',
        wssUrl: 'wss://example.com',
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_URL} (apiKeyId, chainName,network,httpsUrl, wssUrl)
                        VALUES (${apiKeyId}, @chainName,@network, @httpsUrl,@wssUrl)`,
        dto,
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdUrlId = result[0].id;
      const deletedResponse = await RpcUrlService.deleteRpcUrl(
        {
          id: createdUrlId,
        },
        stage.context,
      );

      expect(deletedResponse).toBeDefined();

      const rpcUrlInDB = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.RPC_URL} WHERE id=@id`,
        { id: createdUrlId },
      );
      expect(rpcUrlInDB).toHaveLength(1);
      const dbRpcUrl = rpcUrlInDB[0];
      expect(dbRpcUrl.status).toBe(SqlModelStatus.DELETED);
    });
  });
  describe('listRpcUrls', () => {
    test('User can list Rpc urls for an apiKey', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_API_KEY} (name, project_uuid, uuid, status)
                    VALUES ('RPC ENV', '${projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdApiKeyId = result?.[0]?.id;
      if (!createdApiKeyId) {
        throw new Error('ApiKey not created');
      }
      const testApiKeyId = createdApiKeyId;
      const dto = {
        name: 'Test Env',
        description: 'Test Description',
        projectUuid: 2,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_API_KEY} (name, description, project_uuid, uuid, status)
          VALUES ('${dto.name}', '${dto.description}', ${dto.projectUuid}, '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const urlDto = {
        chainName: 'chain',
        network: 'network',
        httpsUrl: 'https://example.com',
        wssUrl: 'wss://example.com',
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_URL} (apiKeyId, chainName,network,httpsUrl, wssUrl)
                        VALUES (${testApiKeyId}, @chainName,@network, @httpsUrl,@wssUrl)`,
        urlDto,
      );
      const urlResult = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdUrlId = urlResult[0].id;
      const event = {
        query: new ListRpcUrlsForApiKeyQueryFilter({
          apiKeyId: testApiKeyId,
        }),
      };
      const rpcUrls = await RpcUrlService.listRpcUrls(event, stage.context);
      expect(rpcUrls).toBeDefined();
      expect(rpcUrls.items).toHaveLength(1);
      const rpcUrl = rpcUrls.items[0];
      expect(rpcUrl.id).toBe(createdUrlId);
      expect(rpcUrl.apiKeyId).toBe(testApiKeyId);
      expect(rpcUrl.chainName).toBe(urlDto.chainName);
      expect(rpcUrl.network).toBe(urlDto.network);
      expect(rpcUrl.httpsUrl).toBe(urlDto.httpsUrl);
      expect(rpcUrl.wssUrl).toBe(urlDto.wssUrl);
    });
  });

  describe('getEndpoints', () => {
    test('User can get available endpoints', async () => {
      const endpoints = await RpcUrlService.getEndpoints();
      expect(endpoints).toBeDefined();
      expect(endpoints.length).toBeGreaterThan(0);
    });
  });
});
