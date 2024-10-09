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
import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
describe('RPC URL Tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testUser2: TestUser;
  let testProject: Project;
  let testApiKeyId: number;
  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.PROJECT_OWNER,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.PROJECT_OWNER,
    );

    testProject = await createTestProject(testUser, stage);
    await stage.db.infrastructure.paramExecute(
      'INSERT INTO rpc_api_key (name, description, project_uuid, uuid) VALUES (@name, @description, @projectUuid, @uuid)',
      {
        name: 'Test Api Key',
        description: 'Test Description',
        projectUuid: testProject.project_uuid,
        uuid: 'xyz',
      },
    );
    testApiKeyId = (
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
      chainName: 'Polkadot',
      network: 'Mainnet',
      apiKeyId: 0,
    };
    beforeAll(async () => {
      rpcUrlToCreate.apiKeyId = testApiKeyId;
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
      expect(createdUrl.apiKeyId).toBe(testApiKeyId);
      expect(createdUrl.httpsUrl).toBeDefined();
      expect(createdUrl.wssUrl).toBeDefined();
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
        'INSERT INTO rpc_url (name, chainName, network, apiKeyId, httpsUrl, wssUrl) VALUES (@name, @chain, @network, @apiKeyid, @httpsUrl, @wssUrl)',
        {
          name: 'Test URL',
          chain: 'CHAIN',
          network: 'Network',
          apiKeyId: testApiKeyId,
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
        'INSERT INTO rpc_url (name, chainName, network, apiKeyId,httpsUrl, wssUrl) VALUES (@name, @chain, @network, @apiKeyId, @httpsUrl, @wssUrl)',
        {
          name: 'Test URL',
          chain: 'CHAIN',
          network: 'Network',
          apiKeyId: testApiKeyId,
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
      const url = (
        await stage.db.infrastructure.paramExecute(
          `SELECT * FROM rpc_url WHERE id = ${createdUrlId}`,
        )
      )[0];
      expect(url.status).toBe(SqlModelStatus.DELETED);
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

  describe('List RPC URLs for API Key', () => {
    let createdUrlId: number;
    beforeEach(async () => {
      await stage.db.infrastructure.paramExecute(
        'INSERT INTO rpc_url (name, chainName, network, apiKeyId,httpsUrl, wssUrl) VALUES (@name, @chain, @network, @apiKeyId, @httpsUrl, @wssUrl)',
        {
          name: 'Test URL',
          chain: 'CHAIN',
          network: 'Network',
          apiKeyId: testApiKeyId,
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

    it('User should be able to list RPC URLs for his projects', async () => {
      const response = await request(stage.http)
        .get(`/rpc/api-key/${testApiKeyId}/urls`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      const urls = response.body.data.items;
      expect(urls.length).toBe(1);
      expect(urls[0].id).toBe(createdUrlId);
    });

    it('User should not be able to list RPC URLs for other projects', async () => {
      const response = await request(stage.http)
        .get(`/rpc/api-key/${testApiKeyId}/urls`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    it('User should not be able to list RPC URLs for non-existing API Key', async () => {
      const response = await request(stage.http)
        .get(`/rpc/api-key/9999/urls`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
    });
  });
});
