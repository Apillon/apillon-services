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

describe('Admin User tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let adminTestUser: TestUser;
  let testUserUuid: string;

  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUserUuid = testUser.user.user_uuid;
    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );

    testProject = await createTestProject(testUser, stage.devConsoleContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Admin User GET tests', () => {
    test('Get all users (as list)', async () => {
      const response = await request(stage.http)
        .get('/admin-panel/users/')
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.user_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.email).toBeTruthy();
    });

    test('Get user list with query filter', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/users/?search=${testUser.user.name}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      // Only test user found
      expect(response.body.data.items.length).toBe(1);
    });

    test('Non-admin user should NOT be able to get users', async () => {
      const response = await request(stage.http)
        .get('/admin-panel/users/')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Get a single user', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/users/${testUserUuid}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data?.id).toBeTruthy();
      expect(response.body.data?.email).toBeTruthy();
      expect(response.body.data?.user_uuid).toEqual(testUserUuid);
    });

    test('Get projects associated with a user', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/users/${testUserUuid}/projects`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1); // Assuming the user has one associated project
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.project_uuid).toEqual(
        testProject.project_uuid,
      );
      expect(response.body.data.items[0]?.name).toBeTruthy();
    });

    test('Get login history of a user', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/users/${testUserUuid}/logins`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1); // User has logged in once
      expect(response.body.data.items[0]?.loginDate).toBeTruthy();
    });
  });

  describe('Admin User Role tests', () => {
    test('Get roles associated with a user', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/users/${adminTestUser.user.user_uuid}/roles`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2); // Admin and User roles
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[1]?.id).toBeTruthy();
      expect(response.body.data.items[1]?.name).toBeTruthy();
    });

    test('Assign a role to a user', async () => {
      const roleId = 2;
      const postResponse = await request(stage.http)
        .post(`/admin-panel/users/${testUserUuid}/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(postResponse.status).toBe(201);
      expect(
        postResponse.body.data.authUserRoles.find((r) => r.role_id === roleId),
      ).toBeTruthy();
      expect(postResponse.body.data.user_uuid).toBe(testUserUuid);

      const data = await stage.amsContext.mysql.paramExecute(
        `SELECT * FROM authUser_role where authUser_id = ${testUser.user.id}`,
      );
      const userRoleIds = data.map((r) => r.role_id);
      expect(userRoleIds).toContain(DefaultUserRole.USER);
      expect(userRoleIds).toContain(roleId);
    });

    test('Remove a role from a user', async () => {
      const roleId = 2;
      const response = await request(stage.http)
        .delete(`/admin-panel/users/${testUserUuid}/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.authUserRoles.find((r) => r.role_id === roleId),
      ).toBeFalsy();
      expect(response.body.data.user_uuid).toBe(testUserUuid);

      const data = await stage.amsContext.mysql.paramExecute(
        `SELECT * FROM authUser_role where authUser_id = ${testUser.user.id}`,
      );
      const userRoleIds = data.map((r) => r.role_id);
      expect(userRoleIds.find((r) => r.role_id === roleId)).toBeFalsy();
    });
  });

  describe('Admin User Quota tests', () => {
    test('Get all user quotas (as list)', async () => {
      const response = await request(stage.http)
        .get(`/admin-panel/users/${testUserUuid}/quotas`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      // expect(response.body.data.length).toBe(9); // Total quota count
      expect(response.body.data[0]?.id).toBeTruthy();
      expect(response.body.data[0]?.name).toBeTruthy();
      expect(
        response.body.data.find(
          (quota) => quota.id === QuotaCode.MAX_PROJECT_COUNT,
        )?.value,
      ).toBe(1); // Default value for MAX_PROJECT_COUNT quota
    });

    test('Create a new user quota', async () => {
      const postResponse = await request(stage.http)
        .post(`/admin-panel/users/${testUserUuid}/quotas`)
        .send({
          quota_id: QuotaCode.MAX_PROJECT_COUNT,
          value: 10,
          description: 'testing123',
        })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(postResponse.status).toBe(201);
      expect(postResponse.body.data.quota_id).toBe(QuotaCode.MAX_PROJECT_COUNT);
      expect(postResponse.body.data.value).toBe(10);
      expect(postResponse.body.data.description).toBe('testing123');

      const getResponse = await request(stage.http)
        .get(`/admin-panel/users/${testUserUuid}/quotas`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(getResponse.status).toBe(200);
      expect(
        getResponse.body.data.find(
          (quota) => quota.id === QuotaCode.MAX_PROJECT_COUNT,
        )?.value,
      ).toBe(10); // From previous POST request insert
    });

    test('Delete a project quota', async () => {
      const postResponse = await request(stage.http)
        .delete(`/admin-panel/users/${testUserUuid}/quotas`)
        .send({ quota_id: QuotaCode.MAX_PROJECT_COUNT })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(postResponse.status).toBe(200);
      expect(postResponse.body.data.data).toEqual(true);

      const getResponse = await request(stage.http)
        .get(`/admin-panel/users/${testUserUuid}/quotas`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(getResponse.status).toBe(200);
      expect(
        getResponse.body.data.find(
          (quota) => quota.id === QuotaCode.MAX_PROJECT_COUNT,
        )?.value,
      ).toBe(1); // Default value for MAX_PROJECT_COUNT quota
    });
  });
});
