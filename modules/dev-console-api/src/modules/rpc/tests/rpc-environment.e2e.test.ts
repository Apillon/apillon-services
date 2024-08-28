import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import { SqlModelStatus } from '@apillon/lib';
describe('RPC Environment tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testUser2: TestUser;
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
    testProject = await createTestProject(testUser, stage);
  });
  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Create RPC Environment', () => {
    const rpcEnvironmentToCreate = {
      name: 'Test Environment',
      description: 'Test Description',
    };
    it('User should be able to create RPC environment for his projects', async () => {
      const response = await request(stage.http)
        .post('/rpc/environment')
        .send({
          ...rpcEnvironmentToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const createdEnv = response.body.data;
      expect(createdEnv.name).toBe(rpcEnvironmentToCreate.name);
      expect(createdEnv.description).toBe(rpcEnvironmentToCreate.description);
      expect(createdEnv.projectUuid).toBe(testProject.project_uuid);
    });
    it('User should not be able to create RPC environment for other projects', async () => {
      const response = await request(stage.http)
        .post('/rpc/environment')
        .send({
          ...rpcEnvironmentToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
    it('User should not be able to create RPC environment without projectUuid', async () => {
      const response = await request(stage.http)
        .post('/rpc/environment')
        .send({
          ...rpcEnvironmentToCreate,
          //projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });
  });
  describe('Update RPC Environment', () => {
    const existingRpcEnvironment = {
      name: 'Test Environment',
      description: 'Test Description',
    };
    const updatedRpcEnvironment = {
      name: 'Updated Environment',
    };
    let environmentId: number;
    beforeEach(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_environment (name, description, projectUuid, apiKey) VALUES (@name, @description, @projectUuid, @apiKey)',
        {
          name: existingRpcEnvironment.name,
          description: existingRpcEnvironment.description,
          projectUuid: testProject.project_uuid,
          apiKey: 'xy',
        },
      );
      environmentId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });
    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_environment');
    });
    test('User should be able to update RPC environment for his projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/environment/${environmentId}`)
        .send(updatedRpcEnvironment)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const updatedEnv = response.body.data;
      expect(updatedEnv.name).toBe(updatedRpcEnvironment.name);
      expect(updatedEnv.description).toBeNull();
    });
    test('User should not be able to update RPC environment for other projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/environment/${environmentId}`)
        .send(updatedRpcEnvironment)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Revoke RPC Environment', () => {
    let environmentId: number;
    beforeEach(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_environment (name, description, projectUuid, apiKey) VALUES (@name, @description, @projectUuid, @apiKey)',
        {
          name: 'Test Environment',
          description: 'Test Description',
          projectUuid: testProject.project_uuid,
          apiKey: 'xy',
        },
      );
      environmentId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });
    afterEach(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_environment');
    });
    test('User should be able to revoke RPC environment for his projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/environment/${environmentId}/revoke`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const revokedEnv = response.body.data;
      expect(revokedEnv.id).toBe(environmentId);
      expect(revokedEnv.status).toBe(SqlModelStatus.DELETED);
    });
    test('User should not be able to revoke RPC environment for other projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/environment/${environmentId}/revoke`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
  describe('List RPC Environments', () => {
    let createdEnvironment = {
      name: 'Test Environment',
      description: 'Test Description',
      projectUuid: '',
      apiKey: 'xy',
    };
    beforeAll(async () => {
      createdEnvironment.projectUuid = testProject.project_uuid;
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_environment (name, description, projectUuid, apiKey) VALUES (@name, @description, @projectUuid, @apiKey)',
        createdEnvironment,
      );
    });
    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_environment');
    });
    test('User should be able to list RPC environments for his project', async () => {
      const response = await request(stage.http)
        .get('/rpc/environment?project_uuid=' + testProject.project_uuid)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      const env = response.body.data.items[0];
      expect(env.name).toBe(createdEnvironment.name);
      expect(env.description).toBe(createdEnvironment.description);
      expect(env.projectUuid).toBe(testProject.project_uuid);
    });
    test('User should not be able to list RPC environments for other projects', async () => {
      const response = await request(stage.http)
        .get('/rpc/environment?project_uuid=' + testProject.project_uuid)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
});
