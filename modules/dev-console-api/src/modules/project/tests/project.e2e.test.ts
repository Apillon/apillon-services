import { DefaultUserRole, QuotaCode, SqlModelStatus } from '@apillon/lib';
import * as request from 'supertest';
import {
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { BadRequestErrorCode } from '../../../config/types';
import { Project } from '../../project/models/project.model';
import { ProjectUserPendingInvitation } from '../models/project-user-pending-invitation.model';
import { ProjectUser } from '../models/project-user.model';
import { setupTest } from '../../../../test/helpers/setup';

describe('Project tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;

  let testProject: Project;
  let testProject2: Project;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    await stage.configContext.mysql.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid,  object_uuid, package_id, value)
    VALUES 
      (
        5,
        ${QuotaCode.MAX_PROJECT_COUNT},
        null,
        '${testUser.user.user_uuid}', 
        null,
        '20'
      )
    `);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Project CRUD tests', () => {
    test('User should be able to get its projects (as list)', async () => {
      const response = await request(stage.http)
        .get('/projects/user-projects')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.project_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
    });

    test('User should be able to get his project', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.project_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER project', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject2.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body?.data?.project_uuid).toBeFalsy();
    });

    test('User should be able to check if project-quota is reached', async () => {
      const response = await request(stage.http)
        .get(`/projects/qouta-reached`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toBe(false);
    });

    test('User should be able to create new project', async () => {
      const response = await request(stage.http)
        .post(`/projects`)
        .send({
          name: 'Moj testni projekt',
          description: 'Testni opis',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.project_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.description).toBeTruthy();

      const p: Project = await new Project(
        {},
        stage.devConsoleContext,
      ).populateByUUID(response.body.data.project_uuid);
      expect(p.exists()).toBe(true);
    });

    test('User should NOT be able to create new project if required body data is not present', async () => {
      const response = await request(stage.http)
        .post(`/projects`)
        .send({
          description: 'Testni opis',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should be able to update existing project', async () => {
      const response = await request(stage.http)
        .patch(`/projects/${testProject.project_uuid}`)
        .send({
          name: 'Spremenjen naziv projekta',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Spremenjen naziv projekta');

      const p: Project = await new Project(
        {},
        stage.devConsoleContext,
      ).populateByUUID(response.body.data.project_uuid);
      expect(p.exists()).toBe(true);
      expect(p.name).toBe('Spremenjen naziv projekta');
    });

    test('User should NOT be able to update ANOTHER user project', async () => {
      const response = await request(stage.http)
        .patch(`/projects/${testProject2.project_uuid}`)
        .send({
          name: 'Spremenjen naziv projekta',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body?.data?.project_uuid).toBeFalsy();
    });
  });

  describe('Project user tests', () => {
    let addedProjectUser;
    test('User should be able to get project users', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject.project_uuid}/users`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.user_id).toBeTruthy();
      expect(response.body.data.items[0]?.role_id).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER project users', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject2.project_uuid}/users`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to invite existing user to project', async () => {
      const response = await request(stage.http)
        .post(`/projects/${testProject.project_uuid}/invite-user`)
        .send({
          email: testUser2.authUser.email,
          role_id: DefaultUserRole.PROJECT_USER,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      const userOnProject = await new ProjectUser(
        {},
        stage.devConsoleContext,
      ).isUserOnProject(testProject.id, testUser2.user.id);

      expect(userOnProject).toBe(true);

      addedProjectUser = response.body.data;
    });

    test('User should be able to invite new user (not yet registered in Apillon) to project', async () => {
      const response = await request(stage.http)
        .post(`/projects/${testProject.project_uuid}/invite-user`)
        .send({
          email: 'nek-testni-mail-123@gmail.com',
          role_id: DefaultUserRole.PROJECT_USER,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      const pu: ProjectUserPendingInvitation =
        await new ProjectUserPendingInvitation(
          {},
          stage.devConsoleContext,
        ).populateByEmailAndProject(
          testProject.id,
          'nek-testni-mail-123@gmail.com',
        );

      expect(pu.exists()).toBeTruthy();
    });

    test('User should be able to change user role on project', async () => {
      const response = await request(stage.http)
        .patch(`/projects/user/${addedProjectUser.id}`)
        .send({
          role_id: DefaultUserRole.PROJECT_ADMIN,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const pu = await new ProjectUser(
        {},
        stage.devConsoleContext,
      ).populateByProjectAndUser(testProject.id, testUser2.user.id);

      expect(pu.exists()).toBeTruthy();
      expect(pu.role_id).toBe(DefaultUserRole.PROJECT_ADMIN);
    });

    test('User should be able to remove another user from project', async () => {
      const response = await request(stage.http)
        .delete(`/projects/user/${addedProjectUser.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const pu = await new ProjectUser(
        {},
        stage.devConsoleContext,
      ).populateByProjectAndUser(testProject.id, testUser2.user.id);

      expect(pu.exists()).toBeFalsy();
    });

    test('User should be able to remove pending user from project', async () => {
      const response = await request(stage.http)
        .post(`/projects/${testProject.project_uuid}/uninvite-user`)
        .send({
          email: 'nek-testni-mail-123@gmail.com',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      const pu: ProjectUserPendingInvitation =
        await new ProjectUserPendingInvitation(
          {},
          stage.devConsoleContext,
        ).populateByEmailAndProject(
          testProject.id,
          'nek-testni-mail-123@gmail.com',
        );

      expect(pu.exists()).toBeFalsy();
    });
  });

  describe('Project access tests', () => {
    beforeAll(async () => {
      //Insert new user with access to testProject as PROJECT_USER - can view, cannot modify
      testUser3 = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
        DefaultUserRole.PROJECT_USER,
        SqlModelStatus.ACTIVE,
        testProject.project_uuid,
      );
    });
    test('User with role "ProjectUser" should NOT update project', async () => {
      //Only admin & owner can modify project
      const response = await request(stage.http)
        .patch(`/projects/${testProject2.project_uuid}`)
        .send({
          name: 'Spremenjen naziv projekta',
        })
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(403);
      expect(response.body?.data?.project_uuid).toBeFalsy();
    });
    test('User with role "ProjectUser" should NOT invite user to project', async () => {
      //Only admin & owner can invite new user
      const response2 = await request(stage.http)
        .post(`/projects/${testProject.project_uuid}/invite-user`)
        .send({
          email: testUser2.authUser.email,
          role_id: DefaultUserRole.PROJECT_USER,
        })
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response2.status).toBe(403);
    });
  });

  describe('Project quotas tests', () => {
    let quotaTestsUser: TestUser = undefined;
    let quotaTestProject: Project = undefined;

    beforeAll(async () => {
      quotaTestsUser = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
      );
      quotaTestProject = await createTestProject(
        quotaTestsUser,
        stage.devConsoleContext,
      );
      //add 10 users to quotaTestProject - max users on project quota reached
      for (let i = 0; i < 10; i++) {
        await createTestUser(
          stage.devConsoleContext,
          stage.amsContext,
          DefaultUserRole.PROJECT_USER,
          SqlModelStatus.ACTIVE,
          quotaTestProject.project_uuid,
        );
      }

      //create 10 test projects - so max project quota is reached
      for (let i = 0; i < 10; i++) {
        await createTestProject(quotaTestsUser, stage.devConsoleContext);
      }
    });

    test('User should be able to check if project-quota is reached', async () => {
      const response = await request(stage.http)
        .get(`/projects/qouta-reached`)
        .set('Authorization', `Bearer ${quotaTestsUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toBe(true);
    });

    test('User should recieve status 400 when max project quota is reached', async () => {
      const response = await request(stage.http)
        .post(`/projects`)
        .send({
          name: 'Moj testni projekt',
          description: 'Testni opis',
        })
        .set('Authorization', `Bearer ${quotaTestsUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        BadRequestErrorCode[BadRequestErrorCode.MAX_NUMBER_OF_PROJECTS_REACHED],
      );
    });

    test('User should recieve status 400, when max users on project quota is reached, ', async () => {
      const response = await request(stage.http)
        .post(`/projects/${quotaTestProject.project_uuid}/invite-user`)
        .send({
          email: 'nekTestniMail@gmail.com',
          role_id: DefaultUserRole.PROJECT_USER,
        })
        .set('Authorization', `Bearer ${quotaTestsUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        BadRequestErrorCode[
          BadRequestErrorCode.MAX_NUMBER_OF_USERS_ON_PROJECT_REACHED
        ],
      );
    });
  });
});
