import { DefaultUserRole, QuotaCode, SqlModelStatus, env } from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { Project } from '../../../project/models/project.model';
import { setupTest } from '../../../../../test/helpers/setup';

describe('Admin Project tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );
    testProject = await createTestProject(testUser, stage.devConsoleContext);
    await createTestProject(testUser, stage.devConsoleContext);

    await stage.configContext.mysql.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid, object_uuid, package_id, value)
    VALUES
      (
        ${SqlModelStatus.ACTIVE},
        ${QuotaCode.MAX_PROJECT_COUNT},
        '${testProject.project_uuid}',
        null,
        null,
        20
      )
    `);

    await stage.configContext.mysql.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid, object_uuid, package_id, value)
    VALUES
      (
        ${SqlModelStatus.ACTIVE},
        ${QuotaCode.MAX_USERS_ON_PROJECT},
        '${testProject.project_uuid}',
        null,
        null,
        40
      )
    `);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Project GET tests', () => {
    test('Get all projects (as list)', async () => {
      const response = await request(stage.http)
        .get('/admin-panel/projects/')
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.project_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
    });

    test('Get project list with query filter', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/projects/?search=${testProject.name}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      // Only 1 project found
      expect(response.body.data.items.length).toBe(1);
    });

    test('Non-admin user should NOT be able to get projects', async () => {
      const response = await request(stage.http)
        .get('/admin-panel/projects/')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Get a single project', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/projects/${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data?.id).toBeTruthy();
      expect(response.body.data?.project_uuid).toEqual(
        testProject.project_uuid,
      );
      expect(response.body.data?.name).toBeTruthy();
    });
  });

  describe('Admin Project Quota tests', () => {
    test('Get all project quotas (as list)', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/projects/${testProject.project_uuid}/quotas`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      // expect(response.body.data.length).toBe(9); // Total quota count
      expect(response.body.data[0]?.id).toBeTruthy();
      expect(response.body.data[0]?.name).toBeTruthy();
      expect(
        response.body.data.find(
          (quota) => quota.id === QuotaCode.MAX_USERS_ON_PROJECT,
        )?.value,
      ).toBe(40); // From override inserted in beforeAll
    });

    test('Create a new project quota', async () => {
      const response = await request(stage.http)
        .post(`/admin-panel/projects/${testProject.project_uuid}/quotas`)
        .send({
          quota_id: QuotaCode.MAX_API_KEYS,
          value: 20,
          description: 'testing123',
        })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.quota_id).toBe(QuotaCode.MAX_API_KEYS);
      expect(response.body.data.value).toBe(20);
      expect(response.body.data.description).toBe('testing123');

      const data = await stage.configContext.mysql.paramExecute(`
      SELECT * from override WHERE project_uuid = '${testProject.project_uuid}' and quota_id = ${QuotaCode.MAX_API_KEYS}`);
      expect(data[0].quota_id).toBe(QuotaCode.MAX_API_KEYS);
      expect(data[0].value).toBe(20); // From previous POST request insert
    });

    test('Delete a project quota', async () => {
      const postResponse = await request(stage.http)
        .delete(`/admin-panel/projects/${testProject.project_uuid}/quotas`)
        .send({ quota_id: QuotaCode.MAX_API_KEYS })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(postResponse.status).toBe(200);
      expect(postResponse.body.data.data).toEqual(true);

      const getResponse = await request(stage.http)
        .get(`/admin-panel/projects/${testProject.project_uuid}/quotas`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(getResponse.status).toBe(200);
      const data = await stage.configContext.mysql.paramExecute(`
      SELECT * from override WHERE project_uuid = '${testProject.project_uuid}' and quota_id = ${QuotaCode.MAX_API_KEYS}`);
      expect(data.length).toBe(0); // Override should be deleted
    });
  });
});
