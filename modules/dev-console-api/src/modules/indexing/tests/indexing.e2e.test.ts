import { InfrastructureErrorCode } from '@apillon/Infrastructure/src/config/types';
import { IndexerBilling } from '@apillon/Infrastructure/src/modules/indexer/models/indexer-billing.model';
import { Indexer } from '@apillon/Infrastructure/src/modules/indexer/models/indexer.model';
import { SqlModelStatus } from '@apillon/lib';
import {
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';

describe('Indexing module tests', () => {
  //NOTE: Tests for hibernate and delete indexer are written in infrastructure microservice. Calls to sqd endpoints need to be mocked.

  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testIndexer: Indexer;

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
    testProject2 = await createTestProject(testUser2, stage);

    //NOTE: Some tests will fail, if this indexer does not exists in subsquid cloud
    testIndexer = await new Indexer({}, stage.context.infrastructure)
      .populate({
        indexer_uuid: uuidV4(),
        project_uuid: testProject.project_uuid,
        name: 'Test indexer',
        description: 'Test indexer description',
        squidId: 14592,
        squidReference: 'test-indexer@v1',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Indexer CRUD tests', () => {
    test('User should be able to get indexers list', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]).toEqual(
        expect.objectContaining({
          name: testIndexer.name,
          indexer_uuid: testIndexer.indexer_uuid,
          description: testIndexer.description,
          squidId: testIndexer.squidId,
          squidReference: testIndexer.squidReference,
        }),
      );
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.indexer_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.description).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER indexer list', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers?project_uuid=${testProject2.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get indexer by uuid', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          name: testIndexer.name,
          indexer_uuid: testIndexer.indexer_uuid,
          description: testIndexer.description,
          squidId: testIndexer.squidId,
          squidReference: testIndexer.squidReference,
        }),
      );
      expect(response.body.data.squid).toEqual(
        expect.objectContaining({
          id: 14592,
          reference: 'test-indexer@v1',
          name: 'test-indexer',
          slot: 'v1',
          description: 'Indexer used for e2e & unit tests',
        }),
      );
    });

    test('User should recieve 404 if indexer does not exists', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/some-wrong-uuid`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(
        InfrastructureErrorCode.INDEXER_NOT_FOUND,
      );
      expect(response.body.message).toBe(
        InfrastructureErrorCode[InfrastructureErrorCode.INDEXER_NOT_FOUND],
      );
    });

    test('User should recieve 422 if invalid body', async () => {
      const response = await request(stage.http)
        .post(`/indexing/indexer`)
        .send({})
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should NOT create indexer in ANOTHER user project', async () => {
      const response = await request(stage.http)
        .post(`/indexing/indexer`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'New indexer',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to create new indexer', async () => {
      const response = await request(stage.http)
        .post(`/indexing/indexer`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'New test indexer',
          description: 'New test indexer description',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.indexer_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.description).toBeTruthy();
      expect(response.body.data.status).toBe(SqlModelStatus.DRAFT);

      const i: Indexer = await new Indexer(
        {},
        stage.context.infrastructure,
      ).populateByUUID(response.body.data.indexer_uuid);
      expect(i.exists()).toBeTruthy();
    });

    test('User should be able to update indexer', async () => {
      const response = await request(stage.http)
        .patch(`/indexing/indexers/${testIndexer.indexer_uuid}`)
        .send({
          name: 'Updated test indexer',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated test indexer');

      const i: Indexer = await new Indexer(
        {},
        stage.context.infrastructure,
      ).populateByUUID(testIndexer.indexer_uuid);
      expect(i.name).toBe('Updated test indexer');
    });
  });
  describe('Indexer logs, deployments and usage tests', () => {
    test('User should be able to get indexer logs', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}/logs`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(response.body.data.logs[0]).toHaveProperty('id');
      expect(response.body.data.logs[0]).toHaveProperty('level');
      expect(response.body.data.logs[0]).toHaveProperty('timestamp');
      expect(response.body.data.logs[0]).toHaveProperty('container');
      expect(response.body.data.logs[0]).toHaveProperty('payload');
      expect(response.body.data.logs[0].payload).toBeTruthy();
    });

    test('User should be able to get indexer logs filtered by level', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}/logs?level=ERROR`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.logs.every((log) => log.level === 'ERROR'),
      ).toBe(true);
    });

    test('User should be able to get indexer logs filtered by container', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}/logs?container=db`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.logs.every((log) => log.container === 'db'),
      ).toBe(true);
    });

    test('User should be able to get indexer logs from some given date', async () => {
      const dateFrom = new Date();
      dateFrom.setMinutes(dateFrom.getMinutes() - 5);

      const response = await request(stage.http)
        .get(
          `/indexing/indexers/${testIndexer.indexer_uuid}/logs?from=${dateFrom.toISOString()}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.logs.every(
          (log) => new Date(log.timestamp) >= dateFrom,
        ),
      ).toBe(true);
    });

    test('User should be able to get indexer deployments', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}/deployments`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data?.length).toBeGreaterThan(0);
      const deployment = response.body.data[0];
      expect(deployment.id).toBeTruthy();
      expect(deployment.type).toBeTruthy();
      expect(deployment.failed).toBeTruthy();
      expect(deployment.status).toBeTruthy();
      expect(deployment.squid).toBeTruthy();
      expect(deployment.squid.id).toBeTruthy();
      expect(deployment.squid.name).toBe('test-indexer');
      expect(deployment.squid.reference).toBe(testIndexer.squidReference);
    });

    test('User should be able to get indexer usage data', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}/usage`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toBeDefined();
    });
  });
  describe('Indexer billing tests', () => {
    beforeAll(async () => {
      await new IndexerBilling({}, stage.context.infrastructure)
        .populate({
          indexer_id: testIndexer.id,
          year: 2024,
          month: 1,
          billedAmount: 100,
        })
        .insert();
      await new IndexerBilling({}, stage.context.infrastructure)
        .populate({
          indexer_id: testIndexer.id,
          year: 2024,
          month: 2,
          billedAmount: 200,
        })
        .insert();
      await new IndexerBilling({}, stage.context.infrastructure)
        .populate({
          indexer_id: testIndexer.id,
          year: 2024,
          month: 3,
          billedAmount: 130,
        })
        .insert();
    });

    test('User should be able to get indexer billing list', async () => {
      const response = await request(stage.http)
        .get(`/indexing/indexers/${testIndexer.indexer_uuid}/billing`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(3);
      expect(response.body.data.items[0]).toEqual(
        expect.objectContaining({
          year: 2024,
          month: 3,
          billedAmount: 130,
        }),
      );
    });

    test('User should be able to get indexer billing list for specific year and month', async () => {
      const response = await request(stage.http)
        .get(
          `/indexing/indexers/${testIndexer.indexer_uuid}/billing?year=2024&month=2`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]).toEqual(
        expect.objectContaining({
          year: 2024,
          month: 2,
          billedAmount: 200,
        }),
      );
    });
  });
});
