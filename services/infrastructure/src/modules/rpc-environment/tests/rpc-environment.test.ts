import {
  BaseProjectQueryFilter,
  CreateRpcEnvironmentDto,
  DefaultUserRole,
  SqlModelStatus,
  UpdateRpcEnvironmentDto,
} from '@apillon/lib';
import { RpcEnvironmentService } from '../rpc-environment.service';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import { DbTables } from '../../../config/types';
describe('RPC Environment tests', () => {
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
  describe('createRpcEnvironment', () => {
    test('User can create a new Rpc environment', async () => {
      const dto = new CreateRpcEnvironmentDto({
        name: 'Test Env',
        description: 'Test Description',
        projectUuid,
      });
      const createdRpcEnvResponse =
        await RpcEnvironmentService.createRpcEnvironment(
          { data: dto },
          stage.context,
        );
      expect(createdRpcEnvResponse).toBeDefined();
      expect(createdRpcEnvResponse.id).toBeDefined();
      expect(createdRpcEnvResponse.name).toBe(dto.name);
      expect(createdRpcEnvResponse.description).toBe(dto.description);
      expect(createdRpcEnvResponse.projectUuid).toBe(dto.projectUuid);
      expect(createdRpcEnvResponse.apiKey).toBeDefined();
      expect(createdRpcEnvResponse.createTime).toBeDefined();
      const rpcEnvInDB = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.RPC_ENVIRONMENT} WHERE id=@id`,
        { id: createdRpcEnvResponse.id },
      );
      expect(rpcEnvInDB).toHaveLength(1);
      const dbRpcEnv = rpcEnvInDB[0];
      expect(dbRpcEnv.name).toBe(dto.name);
      expect(dbRpcEnv.description).toBe(dto.description);
      expect(dbRpcEnv.projectUuid).toBe(dto.projectUuid);
      expect(dbRpcEnv.apiKey).toBe(createdRpcEnvResponse.apiKey);
    });
  });
  describe('updateRpcEnvironment', () => {
    test('User can update a Rpc environment', async () => {
      const dto = {
        name: 'Test Env',
        description: 'Test Description',
        projectUuid,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_ENVIRONMENT} (name, description, projectUuid, apiKey, status)
                VALUES ('${dto.name}', '${dto.description}', '${dto.projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdEnvironmentId = result[0].id;
      const updateDto = new UpdateRpcEnvironmentDto({
        name: 'Updated Name',
        description: 'Updated Description',
        projectUuid: 2,
      });
      const updatedRpcEnvResponse =
        await RpcEnvironmentService.updateRpcEnvironment(
          {
            data: {
              id: createdEnvironmentId,
              data: updateDto,
            },
          },
          stage.context,
        );
      expect(updatedRpcEnvResponse).toBeDefined();
      expect(updatedRpcEnvResponse.id).toBe(createdEnvironmentId);
      expect(updatedRpcEnvResponse.name).toBe(updateDto.name);
      expect(updatedRpcEnvResponse.description).toBe(updateDto.description);
      expect(updatedRpcEnvResponse.projectUuid).toBe(dto.projectUuid);
      expect(updatedRpcEnvResponse.apiKey).toBeDefined();
      const rpcEnvInDB = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.RPC_ENVIRONMENT} WHERE id=@id`,
        { id: createdEnvironmentId },
      );
      expect(rpcEnvInDB).toHaveLength(1);
      const dbRpcEnv = rpcEnvInDB[0];
      expect(dbRpcEnv.name).toBe(updateDto.name);
      expect(dbRpcEnv.description).toBe(updateDto.description);
      expect(dbRpcEnv.projectUuid).toBe(dto.projectUuid);
      expect(dbRpcEnv.apiKey).toBe(updatedRpcEnvResponse.apiKey);
    });
  });
  describe('revokeRpcEnvironment', () => {
    test('User can revoke a Rpc environment', async () => {
      const dto = {
        name: 'Test Env',
        description: 'Test Description',
        projectUuid,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_ENVIRONMENT} (name, description, projectUuid, apiKey, status)
                VALUES ('${dto.name}', '${dto.description}', '${dto.projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const result = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const createdEnvironmentId = result[0].id;
      const revokedRpcEnvResponse =
        await RpcEnvironmentService.revokeRpcEnvironment(
          {
            id: createdEnvironmentId,
          },
          stage.context,
        );
      expect(revokedRpcEnvResponse).toBeDefined();
      expect(revokedRpcEnvResponse.id).toBe(createdEnvironmentId);
      expect(revokedRpcEnvResponse.name).toBe(dto.name);
      expect(revokedRpcEnvResponse.description).toBe(dto.description);
      expect(revokedRpcEnvResponse.projectUuid).toBe(dto.projectUuid);
      expect(revokedRpcEnvResponse.apiKey).toBeDefined();
      expect(revokedRpcEnvResponse.status).toBe(SqlModelStatus.DELETED);
      const rpcEnvInDB = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.RPC_ENVIRONMENT} WHERE id=@id`,
        { id: createdEnvironmentId },
      );
      expect(rpcEnvInDB).toHaveLength(1);
      const dbRpcEnv = rpcEnvInDB[0];
      expect(dbRpcEnv.name).toBe(dto.name);
      expect(dbRpcEnv.description).toBe(dto.description);
      expect(dbRpcEnv.projectUuid).toBe(dto.projectUuid);
      expect(dbRpcEnv.apiKey).toBe(revokedRpcEnvResponse.apiKey);
      expect(dbRpcEnv.status).toBe(SqlModelStatus.DELETED);
    });
  });
  describe('listRpcEnvironments', () => {
    test('User can list Rpc environments for a project', async () => {
      const dto = {
        name: 'Test Env',
        description: 'Test Description',
        projectUuid: projectUuid2,
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.RPC_ENVIRONMENT} (name, description, projectUuid, apiKey, status)
            VALUES ('${dto.name}', '${dto.description}', '${dto.projectUuid}', '6e0c9d3e-edaf-46f4-a4db-228467659876', ${SqlModelStatus.ACTIVE})`,
      );
      const event = {
        filter: new BaseProjectQueryFilter({
          project_uuid: projectUuid2,
        }),
      };
      const rpcEnvs = await RpcEnvironmentService.listRpcEnvironments(
        event,
        stage.context,
      );
      expect(rpcEnvs).toBeDefined();
      expect(rpcEnvs.items).toHaveLength(1);
      const rpcEnv = rpcEnvs.items[0];
      expect(rpcEnv.name).toBe(dto.name);
      expect(rpcEnv.description).toBe(dto.description);
      expect(rpcEnv.projectUuid).toBe(dto.projectUuid);
      expect(rpcEnv.apiKey).toBeDefined();
    });
  });
});
