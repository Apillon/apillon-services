import { DefaultUserRole, QuotaCode, SqlModelStatus, env } from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestApiKey,
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { Project } from '../../../project/models/project.model';
import { setupTest } from '../../../../../test/helpers/setup';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { User } from '../../../user/models/user.model';
import { AuthUser } from '@apillon/access/src/modules/auth-user/auth-user.model';

describe('Admin Block user tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let testApiKey: ApiKey;

  beforeAll(async () => {
    stage = await setupTest(
      env.ADMIN_CONSOLE_API_PORT_TEST,
      env.ADMIN_CONSOLE_API_HOST_TEST,
    );
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testApiKey = await createTestApiKey(
      stage.amsContext,
      testProject.project_uuid,
    );

    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Admin block, unblock user tests', () => {
    test('User without admin role should not be able to block user', async () => {
      const response = await request(stage.http)
        .post(`/admin-panel/users/${testUser.user.user_uuid}/block`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User without admin role should not be able to unblock user', async () => {
      const response = await request(stage.http)
        .post(`/admin-panel/users/${testUser.user.user_uuid}/unblock`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('Admin should be able to block user', async () => {
      const response = await request(stage.http)
        .post(`/admin-panel/users/${testUser.user.user_uuid}/block`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);

      //Check user
      const user: User = await new User(
        {},
        stage.devConsoleContext,
      ).populateByUUID(testUser.user.user_uuid);
      expect(user.status).toBe(SqlModelStatus.BLOCKED);

      const authUser: AuthUser = await new AuthUser(
        {},
        stage.amsContext,
      ).populateByUserUuid(
        testUser.user.user_uuid,
        undefined,
        SqlModelStatus.BLOCKED,
      );
      expect(authUser.exists()).toBeTruthy();
      expect(authUser.status).toBe(SqlModelStatus.BLOCKED);

      //Check if project was blocked
      const project: Project = await new Project(
        {},
        stage.devConsoleContext,
      ).populateByUUID(testProject.project_uuid);
      expect(project.status).toBe(SqlModelStatus.BLOCKED);

      //Check if api keys were blocked
      const apiKey: ApiKey = await new ApiKey(
        {},
        stage.amsContext,
      ).populateById(testApiKey.id);
      expect(apiKey.status).toBe(SqlModelStatus.BLOCKED);
    });

    test('Blocked user should not be able to login', async () => {
      const response = await request(stage.http).post('/users/login').send({
        email: testUser.authUser.email,
        password: testUser.password,
      });
      expect(response.status).toBe(401);
    });

    test('Blocked user should not be able to call APIs', async () => {
      const response = await request(stage.http)
        .get('/projects/user-projects')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
    });

    test('Admin should be able to unblock user', async () => {
      const response = await request(stage.http)
        .post(`/admin-panel/users/${testUser.user.user_uuid}/unblock`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);

      //Check user
      const user: User = await new User(
        {},
        stage.devConsoleContext,
      ).populateByUUID(testUser.user.user_uuid);
      expect(user.status).toBe(SqlModelStatus.ACTIVE);

      const authUser: AuthUser = await new AuthUser(
        {},
        stage.amsContext,
      ).populateByUserUuid(
        testUser.user.user_uuid,
        undefined,
        SqlModelStatus.ACTIVE,
      );
      expect(authUser.exists()).toBeTruthy();
      expect(authUser.status).toBe(SqlModelStatus.ACTIVE);

      //Check if project was unblocked
      const project: Project = await new Project(
        {},
        stage.devConsoleContext,
      ).populateByUUID(testProject.project_uuid);
      expect(project.status).toBe(SqlModelStatus.ACTIVE);

      //Check if api keys were unblocked
      const apiKey: ApiKey = await new ApiKey(
        {},
        stage.amsContext,
      ).populateById(testApiKey.id);
      expect(apiKey.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('unBlocked user should be able to login', async () => {
      const response = await request(stage.http).post('/users/login').send({
        email: testUser.authUser.email,
        password: testUser.password,
      });
      expect(response.status).toBe(201);
      testUser.token = response.body.data.token;
    });

    test('unBlocked user should be able to call APIs', async () => {
      const response = await request(stage.http)
        .get('/projects/user-projects')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
    });
  });
});
