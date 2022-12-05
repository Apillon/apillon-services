import { AttachedServiceType } from '@apillon/lib';
import * as request from 'supertest';
import { createTestProject } from '../../../../test/helpers/project';
import { createTestProjectService } from '../../../../test/helpers/service';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { Project } from '../../project/models/project.model';
import { Service } from '../models/service.model';

describe('Project services tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testProjectService: Service;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testProjectService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Service CRUD tests', () => {
    test('User should be able to get project service list', async () => {
      const response = await request(stage.http)
        .get(`/services?project_id=${testProject.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.service_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.serviceType_id).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER project service list', async () => {
      const response = await request(stage.http)
        .get(`/services?project_id=${testProject2.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should get 422 status if required query parameters are not supplied', async () => {
      const response = await request(stage.http)
        .get(`/services`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should get 404 status if project does not exists', async () => {
      const response = await request(stage.http)
        .get(`/services?project_id=555`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
    });

    test('User should be able to get service', async () => {
      const response = await request(stage.http)
        .get(`/services/${testProjectService.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.service_uuid).toBeTruthy();
      expect(response.body.data.serviceType_id).toBeTruthy();
    });

    test('User should recieve 404 status if service does not exists', async () => {
      const response = await request(stage.http)
        .get(`/services/555`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
      expect(response.body?.data?.id).toBeFalsy();
    });

    test('User should be able to create new service', async () => {
      const response = await request(stage.http)
        .post(`/services`)
        .send({
          project_id: testProject.id,
          name: 'Storage service',
          active: true,
          serviceType_id: AttachedServiceType.STORAGE,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.service_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.serviceType_id).toBe(
        AttachedServiceType.STORAGE,
      );

      const s: Service = await new Service(
        {},
        stage.devConsoleContext,
      ).populateById(response.body.data.id);

      expect(s.exists()).toBeTruthy();
    });

    test('User should be able to update service', async () => {
      const response = await request(stage.http)
        .patch(`/services/${testProjectService.id}`)
        .send({
          name: 'spremenjeno ime',
          active: false,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBe('spremenjeno ime');
      expect(response.body.data.active).toBeFalsy();

      const s: Service = await new Service(
        {},
        stage.devConsoleContext,
      ).populateById(response.body.data.id);

      expect(s.exists()).toBeTruthy();
      expect(s.name).toBe('spremenjeno ime');
      expect(s.active).toBeFalsy();
    });

    test('User should NOT be able to delete ANOTHER USER service', async () => {
      const response = await request(stage.http)
        .delete(`/services/${testProjectService.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to delete service', async () => {
      const response = await request(stage.http)
        .delete(`/services/${testProjectService.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const s: Service = await new Service(
        {},
        stage.devConsoleContext,
      ).populateById(testProjectService.id);

      expect(s.exists()).toBeFalsy();
    });
  });
});
