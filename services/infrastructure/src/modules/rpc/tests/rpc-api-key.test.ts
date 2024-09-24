import {
  BaseProjectQueryFilter,
  DefaultUserRole,
  SqlModelStatus,
  UpdateRpcApiKeyDto,
} from '@apillon/lib';
import { RpcApiKeyService } from '../rpc-api-key.service';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import { DbTables } from '../../../config/types';
describe('RPC ApiKey tests', () => {
  let stage: Stage;
  const projectUuid = 'uuid';
  const projectUuid2 = 'uuid2';
  beforeAll(async () => {
    stage = await setupTest();
    stage.context.user = {
      authUser: {
        authUserRoles: [
          {
            project_uuid: projectUuid,
            role: {
              id: DefaultUserRole.PROJECT_ADMIN,
            },
          },
          {
            project_uuid: projectUuid2,
            role: {
              id: DefaultUserRole.PROJECT_ADMIN,
            },
          },
        ],
      },
    };
  });
  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('updateRpcApiKey', () => {
    test('User can update a Rpc api key', async () => {
      const dto = {
        name: 'Test ApiKey',
        description: 'Test Description',
        projectUuid,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_API_KEY} (name, description, projectUuid, uuid, status)
                VALUES ('${dto.name}', '${dto.description}', '${dto.projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdApiKeyId = result[0].id;
      const updateDto = new UpdateRpcApiKeyDto({
        name: 'Updated Name',
        description: 'Updated Description',
        projectUuid: 2,
      });
      const updatedRpcApiKeyResponse = await RpcApiKeyService.updateRpcApiKey(
        {
          data: {
            id: createdApiKeyId,
            data: updateDto,
          },
        },
        stage.context,
      );
      expect(updatedRpcApiKeyResponse).toBeDefined();
      expect(updatedRpcApiKeyResponse.id).toBe(createdApiKeyId);
      expect(updatedRpcApiKeyResponse.name).toBe(updateDto.name);
      expect(updatedRpcApiKeyResponse.description).toBe(updateDto.description);
      expect(updatedRpcApiKeyResponse.projectUuid).toBe(dto.projectUuid);
      expect(updatedRpcApiKeyResponse.uuid).toBeDefined();
      const rpcApiKeyInDB = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.RPC_API_KEY} WHERE id=@id`,
        { id: createdApiKeyId },
      );
      expect(rpcApiKeyInDB).toHaveLength(1);
      const dbRpcApiKey = rpcApiKeyInDB[0];
      expect(dbRpcApiKey.name).toBe(updateDto.name);
      expect(dbRpcApiKey.description).toBe(updateDto.description);
      expect(dbRpcApiKey.projectUuid).toBe(dto.projectUuid);
      expect(dbRpcApiKey.uuid).toBe(updatedRpcApiKeyResponse.uuid);
    });
  });
  /*
  Uncomment once user can have multiple keys
  describe('revokeRpcApiKey', () => {
    test('User can revoke a Rpc api key', async () => {
      const dto = {
        name: 'Test ApiKey',
        description: 'Test Description',
        projectUuid,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_API_KEY} (name, description, projectUuid, uuid, status)
                VALUES ('${dto.name}', '${dto.description}', '${dto.projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdApiKeyId = result[0].id;
      const revokedRpcApiKeyResponse = await RpcApiKeyService.revokeRpcApiKey(
        {
          id: createdApiKeyId,
          dwellirUserId: '',
        },
        stage.context,
      );
      expect(revokedRpcApiKeyResponse).toBeDefined();
      expect(revokedRpcApiKeyResponse.id).toBe(createdApiKeyId);
      expect(revokedRpcApiKeyResponse.name).toBe(dto.name);
      expect(revokedRpcApiKeyResponse.description).toBe(dto.description);
      expect(revokedRpcApiKeyResponse.projectUuid).toBe(dto.projectUuid);
      expect(revokedRpcApiKeyResponse.uuid).toBeDefined();
      expect(revokedRpcApiKeyResponse.status).toBe(SqlModelStatus.DELETED);
      const rpcApiKeyInDB = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.RPC_API_KEY} WHERE id=@id`,
        { id: createdApiKeyId },
      );
      expect(rpcApiKeyInDB).toHaveLength(1);
      const dbRpcApiKey = rpcApiKeyInDB[0];
      expect(dbRpcApiKey.name).toBe(dto.name);
      expect(dbRpcApiKey.description).toBe(dto.description);
      expect(dbRpcApiKey.projectUuid).toBe(dto.projectUuid);
      expect(dbRpcApiKey.uuid).toBe(revokedRpcApiKeyResponse.uuid);
      expect(dbRpcApiKey.status).toBe(SqlModelStatus.DELETED);
    });
  });
     */
  describe('listRpcApiKeys', () => {
    test('User can list Rpc api keys for a project', async () => {
      const dto = {
        name: 'Test ApiKey',
        description: 'Test Description',
        projectUuid: projectUuid2,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_API_KEY} (name, description, projectUuid, uuid, status)
            VALUES ('${dto.name}', '${dto.description}', '${dto.projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const event = {
        filter: new BaseProjectQueryFilter({
          project_uuid: projectUuid2,
        }),
      };
      const rpcApiKeys = await RpcApiKeyService.listRpcApiKeys(
        event,
        stage.context,
      );
      expect(rpcApiKeys).toBeDefined();
      expect(rpcApiKeys.items).toHaveLength(1);
      const rpcApiKey = rpcApiKeys.items[0];
      expect(rpcApiKey.name).toBe(dto.name);
      expect(rpcApiKey.description).toBe(dto.description);
      expect(rpcApiKey.projectUuid).toBe(dto.projectUuid);
      expect(rpcApiKey.uuid).toBeDefined();
    });
  });
});
