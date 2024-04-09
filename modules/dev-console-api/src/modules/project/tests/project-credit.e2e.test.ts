import { Credit } from '@apillon/config/src/modules/credit/models/credit.model';
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
import { AddCreditDto, Scs } from '@apillon/lib';

describe('Project credit e2e tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage, 1000);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Project credit tests', () => {
    test('User should be able to get credit balance for project', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject.project_uuid}/credit`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.balance).toBe(1000);
    });

    test('User should NOT be able to get credit balance for another user project', async () => {
      const response = await request(stage.http)
        .get(`/projects/${testProject.project_uuid}/credit`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('Credit balance should be smaller after performing actions which require credit spend', async () => {
      // call storage MS, to create new website (credit spend)
      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My test Website',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.website_uuid).toBeTruthy();

      //Check credit balance
      const projectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBeLessThan(1000);
      expect(projectCredit.lastAlertTime).toBeFalsy();
    });

    test('User should be notified if below threshold', async () => {
      const projectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);
      projectCredit.balance = 150;
      await projectCredit.update();

      // call storage MS, to create new website (credit spend)
      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My 2 test Website',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.website_uuid).toBeTruthy();

      //Check credit balance and alert time
      const tmpProjectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);

      expect(tmpProjectCredit.exists()).toBeTruthy();
      expect(tmpProjectCredit.balance).toBeLessThan(100);
      expect(tmpProjectCredit.lastAlertTime).toBeTruthy();
      expect(
        new Date().getTime() -
          new Date(tmpProjectCredit.lastAlertTime).getTime(),
      ).toBeLessThan(60000);
    });

    test('Last alert time should be set to NULL on addCredit', async () => {
      const addCreditBody = new AddCreditDto(
        {
          project_uuid: testProject.project_uuid,
          amount: 1000,
          referenceTable: 'manually_added',
          referenceId: 'some_uuid',
        },
        stage.devConsoleContext,
      );
      await new Scs(stage.devConsoleContext).addCredit(addCreditBody);

      //Check credit balance and alert time
      const tmpProjectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);

      expect(tmpProjectCredit.exists()).toBeTruthy();
      expect(tmpProjectCredit.balance).toBeGreaterThan(1000);
      expect(tmpProjectCredit.lastAlertTime).toBeFalsy();
    });

    test('User should be able to change config for credit alerting', async () => {
      const response = await request(stage.http)
        .patch(`/projects/${testProject.project_uuid}/credit-settings`)
        .send({
          threshold: 500,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const tmpProjectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);
      expect(tmpProjectCredit.threshold).toBe(500);
    });

    test('User should be able to change(disable - threshold = 0) config for credit alerting', async () => {
      const response = await request(stage.http)
        .patch(`/projects/${testProject.project_uuid}/credit-settings`)
        .send({
          threshold: 0,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const tmpProjectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);
      expect(tmpProjectCredit.threshold).toBe(0);
    });

    test('User should NOT be able to change config for another user project', async () => {
      const response = await request(stage.http)
        .patch(`/projects/${testProject.project_uuid}/credit-settings`)
        .send({
          threshold: 500,
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should not be notified if threshold is not set', async () => {
      const projectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);
      projectCredit.balance = 150;
      projectCredit.lastAlertTime = null;
      projectCredit.threshold = 0;
      await projectCredit.update();

      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My 3 test Website',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.website_uuid).toBeTruthy();

      const tmpProjectCredit = await new Credit(
        {},
        stage.configContext,
      ).populateByProjectUUIDForUpdate(testProject.project_uuid, undefined);
      expect(tmpProjectCredit.balance).toBeLessThan(150);
      expect(tmpProjectCredit.lastAlertTime).toBeFalsy();
    });
  });
});
