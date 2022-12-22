import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
import * as request from 'supertest';
import { createTestProject } from '../../../../test/helpers/project';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';
import { ProjectUserPendingInvitation } from '../models/project-user-pending-invitation.model';
import { ProjectUser } from '../models/project-user.model';

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
        .get(`/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.project_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER project', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject2.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body?.data?.id).toBeFalsy();
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
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.project_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.description).toBeTruthy();

      const p: Project = await new Project(
        {},
        stage.devConsoleContext,
      ).populateById(response.body.data.id);
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
        .patch(`/projects/${testProject.id}`)
        .send({
          name: 'Spremenjen naziv projekta',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Spremenjen naziv projekta');

      const p: Project = await new Project(
        {},
        stage.devConsoleContext,
      ).populateById(response.body.data.id);
      expect(p.exists()).toBe(true);
      expect(p.name).toBe('Spremenjen naziv projekta');
    });

    test('User should NOT be able to update ANOTHER user project', async () => {
      const response = await request(stage.http)
        .patch(`/projects/${testProject2.id}`)
        .send({
          name: 'Spremenjen naziv projekta',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body?.data?.id).toBeFalsy();
    });
  });

  describe('Project user tests', () => {
    let addedProjectUser;
    test('User should be able to get project users', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject.id}/users`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.user_id).toBeTruthy();
      expect(response.body.data.items[0]?.role_id).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER project users', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject2.id}/users`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to invite existing user to project', async () => {
      const response = await request(stage.http)
        .post(`/projects/${testProject.id}/invite-user`)
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
        .post(`/projects/${testProject.id}/invite-user`)
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
        .patch(`/projects/${testProject2.id}`)
        .send({
          name: 'Spremenjen naziv projekta',
        })
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(403);
      expect(response.body?.data?.id).toBeFalsy();
    });
    test('User with role "ProjectUser" should NOT invite user to project', async () => {
      //Only admin & owner can invite new user
      const response2 = await request(stage.http)
        .post(`/projects/${testProject.id}/invite-user`)
        .send({
          email: testUser2.authUser.email,
          role_id: DefaultUserRole.PROJECT_USER,
        })
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response2.status).toBe(403);
    });
  });
});
