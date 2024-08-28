import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import * as request from 'supertest';
import { SqlModelStatus } from '@apillon/lib';
describe('RPC URL Tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testUser2: TestUser;
  let testProject: Project;
  let testEnvironmentId: number;
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
    await stage.db.infrastructure.paramExecute(
      'INSERT INTO rpc_environment (name, description, projectUuid, apiKey) VALUES (@name, @description, @projectUuid, @apiKey)',
      {
        name: 'Test Environment',
        description: 'Test Description',
        projectUuid: testProject.project_uuid,
        apiKey: 'xyz',
      },
    );
    testEnvironmentId = (
      await stage.db.infrastructure.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      )
    )[0].id;
  });
  afterAll(async () => {
    await releaseStage(stage);
  });
  describe('Create RPC URL', () => {
    const rpcUrlToCreate = {
      name: 'Test URL',
      chainName: 'CHAIN',
      network: 'Network',
      environmentId: 0,
    };
    beforeAll(async () => {
      rpcUrlToCreate.environmentId = testEnvironmentId;
    });
    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_url');
    });
    it('User should be able to create RPC URL for his projects', async () => {
      const response = await request(stage.http)
        .post('/rpc/url')
        .send(rpcUrlToCreate)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const createdUrl = response.body.data;
      expect(createdUrl.id).toBeDefined();
      expect(createdUrl.name).toBe(rpcUrlToCreate.name);
      expect(createdUrl.chainName).toBe(rpcUrlToCreate.chainName);
      expect(createdUrl.network).toBe(rpcUrlToCreate.network);
      expect(createdUrl.environmentId).toBe(testEnvironmentId);
    });
    it('User should not be able to create RPC URL for other projects', async () => {
      const response = await request(stage.http)
        .post('/rpc/url')
        .send(rpcUrlToCreate)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Update RPC URL', () => {
    const rpcUrlToUpdate = {
      name: 'Updated name',
    };
    let createdUrlId: number;
    beforeAll(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_url (name, chainName, network, environmentId,httpsUrl, wssUrl) VALUES (@name, @chain, @network, @environmentId, @httpsUrl, @wssUrl)',
        {
          name: 'Test URL',
          chain: 'CHAIN',
          network: 'Network',
          environmentId: testEnvironmentId,
          httpsUrl: 'https://example.com',
          wssUrl: 'wss://example.com',
        },
      );
      createdUrlId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });
    afterAll(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_url');
    });
    it('User should be able to update RPC URL for his projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/url/${createdUrlId}`)
        .send(rpcUrlToUpdate)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const updatedUrl = response.body.data;
      expect(updatedUrl.id).toBe(createdUrlId);
      expect(updatedUrl.name).toBe(rpcUrlToUpdate.name);
    });
    it('User should not be able to update RPC URL for other projects', async () => {
      const response = await request(stage.http)
        .put(`/rpc/url/${createdUrlId}`)
        .send(rpcUrlToUpdate)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
    it('User should not be able to update non-existing RPC URL', async () => {
      const response = await request(stage.http)
        .put(`/rpc/url/999999`)
        .send(rpcUrlToUpdate)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
    });
  });
  describe('Delete RPC URL', () => {
    let createdUrlId: number;
    beforeEach(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_url (name, chainName, network, environmentId,httpsUrl, wssUrl) VALUES (@name, @chain, @network, @environmentId, @httpsUrl, @wssUrl)',
        {
          name: 'Test URL',
          chain: 'CHAIN',
          network: 'Network',
          environmentId: testEnvironmentId,
          httpsUrl: 'https://example.com',
          wssUrl: 'wss://example.com',
        },
      );
      createdUrlId = (
        await stage.db.infrastructure.paramExecute(
          `SELECT LAST_INSERT_ID() as id`,
        )
      )[0].id;
    });
    afterEach(async () => {
      await stage.db.infrastructure.paramExecute('DELETE FROM rpc_url');
    });
    it('User should be able to delete RPC URL for his projects', async () => {
      const response = await request(stage.http)
        .delete(`/rpc/url/${createdUrlId}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const deletedUrl = response.body.data;
      expect(deletedUrl.id).toBe(createdUrlId);
      expect(deletedUrl.status).toBe(SqlModelStatus.DELETED);
    });
    it('User should not be able to delete RPC URL for other projects', async () => {
      const response = await request(stage.http)
        .delete(`/rpc/url/${createdUrlId}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
    it('User should not be able to delete non-existing RPC URL', async () => {
      const response = await request(stage.http)
        .delete(`/rpc/url/999999`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
    });
  });
});
