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
describe('RPC ApiKey tests', () => {
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

  describe('Create RPC Api Key', () => {
    const rpcApiKeyToCreate = {
      name: 'Test ApiKey',
      description: 'Test Description',
    };
    it('User should be able to create RPC api-key for his projects', async () => {
      const response = await request(stage.http)
        .post('/rpc/api-key')
        .send({
          ...rpcApiKeyToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const createdEnv = response.body.data;
      expect(createdEnv.name).toBe(rpcApiKeyToCreate.name);
      expect(createdEnv.description).toBe(rpcApiKeyToCreate.description);
      expect(createdEnv.uuid).toBeDefined();
      expect(createdEnv.projectUuid).toBe(testProject.project_uuid);

      const user = (
        await stage.db.devConsole.paramExecute(
          'SELECT dwellir_id from user where id = @userId',
          { userId: testUser.user.id },
        )
      )[0];

      expect(user.dwellir_id).toBeDefined();
    });
    it('User should not be able to create RPC api-key for other projects', async () => {
      const response = await request(stage.http)
        .post('/rpc/api-key')
        .send({
          ...rpcApiKeyToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
    it('User should not be able to create RPC api-key without projectUuid', async () => {
      const response = await request(stage.http)
        .post('/rpc/api-key')
        .send(rpcApiKeyToCreate)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });
  });

  describe('Update RPC ApiKey', () => {
    const existingRpcApiKey = {
      name: 'Test ApiKey',
      description: 'Test Description',
    };
    const updatedRpcApiKey = {
      name: 'Updated ApiKey',
    };
    let apiKeyId: number;
    beforeEach(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO RPC_API_KEY (name, description, projectUuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
        {
          name: existingRpcApiKey.name,
          description: existingRpcApiKey.description,
          projectUuid: testProject.project_uuid,
          uuid: 'xy',
        },
      );
      apiKeyId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });
    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM RPC_API_KEY');
    });
    test('User should be able to update RPC api-key for his projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/api-key/${apiKeyId}`)
        .send(updatedRpcApiKey)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const updatedEnv = response.body.data;
      expect(updatedEnv.name).toBe(updatedRpcApiKey.name);
      expect(updatedEnv.description).toBeNull();
    });
    test('User should not be able to update RPC api-key for other projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/api-key/${apiKeyId}`)
        .send(updatedRpcApiKey)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
  /*
  describe('Revoke RPC Api Key', () => {
    afterEach(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM RPC_API_KEY');
    });
    /**
     * 
     Reenable when/if max api key quota is increased
    test('User should be able to revoke RPC api-key for his projects', async () => {
      const rpcApiKeyToCreate = {
        name: 'Test ApiKey',
        description: 'Test Description',
      };

      let response = await request(stage.http)
        .post('/rpc/api-key')
        .send({
          ...rpcApiKeyToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser.token}`);

      // Need two api keys to test revoke
      response = await request(stage.http)
        .post('/rpc/api-key')
        .send({
          ...rpcApiKeyToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser.token}`);

      const revertResponse = await request(stage.http)
        .put(`/rpc/api-key/${response.body.data.id}/revoke`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(revertResponse.status).toBe(200);
      const revokedEnv = revertResponse.body.data;
      expect(revokedEnv.id).toBe(response.body.data.id);
      expect(revokedEnv.status).toBe(SqlModelStatus.DELETED);
    });
    
    test('User should not be able to revoke RPC api-key for other projects', async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO RPC_API_KEY (name, description, projectUuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
        {
          name: 'Test ApiKey',
          description: 'Test Description',
          projectUuid: testProject.project_uuid,
          uuid: 'xy',
        },
      );
      const apiKeyId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
      const response = await request(stage.http)
        .put(`/rpc/api-key/${apiKeyId}/revoke`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });*/

  describe('List RPC ApiKeys', () => {
    let createdApiKey = {
      name: 'Test ApiKey',
      description: 'Test Description',
      projectUuid: '',
      uuid: 'xy',
    };

    beforeAll(async () => {
      createdApiKey.projectUuid = testProject.project_uuid;
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO RPC_API_KEY (name, description, projectUuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
        createdApiKey,
      );
    });
    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM RPC_API_KEY');
    });

    test('User should be able to list RPC api-keys for his project', async () => {
      const response = await request(stage.http)
        .get('/rpc/api-key?project_uuid=' + testProject.project_uuid)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      const env = response.body.data.items[0];
      expect(env.name).toBe(createdApiKey.name);
      expect(env.description).toBe(createdApiKey.description);
      expect(env.projectUuid).toBe(testProject.project_uuid);
      expect(env.uuid).toBe(createdApiKey.uuid);
    });

    test('User should not be able to list RPC api-keys for other projects', async () => {
      const response = await request(stage.http)
        .get('/rpc/api-key?project_uuid=' + testProject.project_uuid)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Get RPC ApiKey Usage', () => {
    const rpcApiKeyToCreate = {
      name: 'Test ApiKey',
      description: 'Test Description',
    };
    let apiKeyId: number;

    beforeAll(async () => {
      const response = await request(stage.http)
        .post('/rpc/api-key')
        .send({
          ...rpcApiKeyToCreate,
          projectUuid: testProject.project_uuid,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      apiKeyId = response.body.data.id;
    });

    test('User should be able to get RPC api-key usage', async () => {
      const response = await request(stage.http)
        .get(`/rpc/api-key/${apiKeyId}/usage`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
    });
  });
});
