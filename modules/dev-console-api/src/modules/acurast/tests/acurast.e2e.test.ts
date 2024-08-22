import {
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { Project } from '../../project/models/project.model';
import { setupTest } from '../../../../test/helpers/setup';
import { AcurastJob } from '@apillon/computing/src/modules/acurast/models/acurast-job.model';
import { CloudFunction } from '@apillon/computing/src/modules/acurast/models/cloud-function.model';

describe('Acurast controller tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testProject: Project;

  let cloudFunction: CloudFunction;
  let job: AcurastJob;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);

    cloudFunction = await new CloudFunction({}, stage.context.computing)
      .fake()
      .populate({ project_uuid: testProject.project_uuid })
      .insert();

    job = await new AcurastJob({}, stage.context.computing)
      .fake()
      .populate({
        function_uuid: cloudFunction.function_uuid,
        project_uuid: testProject.project_uuid,
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Cloud Function tests', () => {
    const name = 'Acurast';
    const description = 'My new Cloud Function';
    test('User should be able to create a cloud function', async () => {
      const response = await request(stage.http)
        .post('/acurast/cloud-functions')
        .send({ name, description, project_uuid: testProject.project_uuid })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.function_uuid).toBeTruthy();
      expect(response.body.data.name).toEqual(name);
      expect(response.body.data.description).toEqual(description);

      const newCloudFunction = await new CloudFunction(
        {},
        stage.context.computing,
      ).populateByUUID(response.body.data.function_uuid);
      expect(newCloudFunction.exists());
      expect(newCloudFunction.name).toEqual(name);
      expect(newCloudFunction.description).toEqual(description);
    });

    test('User should be able to list cloud functions', async () => {
      const response = await request(stage.http)
        .get(
          `/acurast/cloud-functions?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toEqual(2);
    });

    test('User should be able to get a specific cloud function', async () => {
      const response = await request(stage.http)
        .get(`/acurast/cloud-functions/${cloudFunction.function_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.function_uuid).toBe(
        cloudFunction.function_uuid,
      );
      expect(response.body.data.name).toBe(cloudFunction.name);
      expect(response.body.data.description).toBe(cloudFunction.description);
    });

    test('User should be able to update a cloud function', async () => {
      const response = await request(stage.http)
        .patch(`/acurast/cloud-functions/${cloudFunction.function_uuid}`)
        .send({ name: 'Updated Cloud Function' })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Cloud Function');

      const updatedCloudFunction = await new CloudFunction(
        {},
        stage.context.computing,
      ).populateByUUID(cloudFunction.function_uuid);
      expect(updatedCloudFunction.exists()).toBeTruthy();
      expect(updatedCloudFunction.name).toBe('Updated Cloud Function');
    });
  });

  describe('Job tests', () => {
    // test('User should be able to create a job for a cloud function', async () => {
    //   const response = await request(stage.http)
    //     .post(`/acurast/cloud-functions/${cloudFunction.function_uuid}/jobs`)
    //     .send({ name: 'My new Job', cron: '* * * * *' })
    //     .set('Authorization', `Bearer ${testUser.token}`);
    //   expect(response.status).toBe(201);
    //   expect(response.body.data.job_uuid).toBeTruthy();

    //   const newJob = await new AcurastJob(
    //     {},
    //     stage.context.computing,
    //   ).populateByUUID(response.body.data.job_uuid);
    //   expect(newJob.exists()).toBeTruthy();
    // });

    test('User should be able to get a specific job', async () => {
      const response = await request(stage.http)
        .get(`/acurast/jobs/${job.job_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.job_uuid).toBe(job.job_uuid);
      expect(response.body.data.name).toBe(job.name);
    });

    test('User should be able to update a job', async () => {
      const response = await request(stage.http)
        .patch(`/acurast/jobs/${job.job_uuid}`)
        .send({ name: 'Updated Job' })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Job');

      const updatedJob = await new AcurastJob(
        {},
        stage.context.computing,
      ).populateByUUID(job.job_uuid);
      expect(updatedJob.exists()).toBeTruthy();
      expect(updatedJob.name).toBe('Updated Job');
    });

    // test('User should be able to delete a job', async () => {
    //   const jobToDelete = await new AcurastJob({}, stage.context.computing)
    //     .fake()
    //     .populate({ function_uuid: cloudFunction.function_uuid })
    //     .insert();

    //   const response = await request(stage.http)
    //     .delete(`/acurast/jobs/${jobToDelete.job_uuid}`)
    //     .set('Authorization', `Bearer ${testUser.token}`);
    //   expect(response.status).toBe(200);

    //   const deletedJob = await new AcurastJob(
    //     {},
    //     stage.context.computing,
    //   ).populateByUUID(jobToDelete.job_uuid);
    //   expect(deletedJob.exists()).toBeFalsy();
    // });
  });

  // describe('Job Environment tests', () => {
  //   test('User should be able to set the job environment', async () => {
  //     const response = await request(stage.http)
  //       .post(`/acurast/jobs/${job.job_uuid}/environment`)
  //       .send({ environment: { VAR: 'value' } })
  //       .set('Authorization', `Bearer ${testUser.token}`);
  //     expect(response.status).toBe(200);
  //     expect(response.body.data.job_uuid).toBe(job.job_uuid);
  //   });
  // });
});
