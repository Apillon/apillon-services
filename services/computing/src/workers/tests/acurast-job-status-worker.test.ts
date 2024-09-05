import { BlockchainMicroservice } from '@apillon/lib';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { AcurastJobStatusWorker } from '../acurast-job-status-worker';
import { AcurastJob } from '../../modules/acurast/models/acurast-job.model';
import { AcurastClient } from '../../modules/clients/acurast.client';
import { AcurastJobStatus, DbTables } from '../../config/types';
import { setupTest, releaseStage, Stage } from '../../../test/setup';
import { expect } from '@jest/globals';
import { ServiceContext } from '@apillon/service-lib';
import { WorkerName } from '../worker-executor';
import { getConfig } from '@apillon/tests-lib';
import { v4 as uuidV4 } from 'uuid';
import { CloudFunction } from '../../modules/acurast/models/cloud-function.model';

let config: any;

let DEPLOYER_ADDRESS;
let ACCOUNT;
let PUBLIC_KEY;
let ENDPOINT;

async function runAcurastJobStatusWorker(context: ServiceContext) {
  const serviceDef: ServiceDefinition = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  };
  const jobStatusWorker = new AcurastJobStatusWorker(
    new WorkerDefinition(serviceDef, WorkerName.ACURAST_JOB_STATUS_WORKER, {}),
    context,
  );
  await jobStatusWorker.runExecutor();
}

describe('Acurast Job Status Worker Tests', () => {
  let stage: Stage;
  let getJobStatusMock: jest.SpyInstance;
  let getAssignedProcessorsMock: jest.SpyInstance;
  let getJobPublicKeyMock: jest.SpyInstance;
  let getAcurastEndpointMock: jest.SpyInstance;

  beforeAll(async () => {
    config = await getConfig();

    DEPLOYER_ADDRESS = config.acurast.deployerAddress;
    ACCOUNT = config.acurast.account;
    PUBLIC_KEY = config.acurast.publicKey;
    ENDPOINT = config.acurast.endpoint.url;

    stage = await setupTest();

    getJobStatusMock = jest.spyOn(AcurastClient.prototype, 'getJobStatus');
    getAssignedProcessorsMock = jest.spyOn(
      AcurastClient.prototype,
      'getAssignedProcessors',
    );
    getJobPublicKeyMock = jest.spyOn(
      AcurastClient.prototype,
      'getJobPublicKey',
    );
    getAcurastEndpointMock = jest.spyOn(
      BlockchainMicroservice.prototype,
      'getChainEndpoint',
    );

    await createAcurastJob(stage, 1, AcurastJobStatus.DEPLOYING);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Job Status Processing', () => {
    test('should not update a job which is not yet deployed', async () => {
      mockGetAcurastEndpoint(getAcurastEndpointMock);
      mockGetJobStatus(getJobStatusMock);
      mockGetAssignedProcessors(getAssignedProcessorsMock);
      mockGetJobPublicKey(getJobPublicKeyMock);

      await runAcurastJobStatusWorker(stage.context);

      expect(getJobStatusMock).not.toBeCalled();
      expect(getAssignedProcessorsMock).not.toBeCalled();
      expect(getJobPublicKeyMock).not.toBeCalled();

      const updatedJob = await getAcurastJob(stage, 1);
      expect(updatedJob.jobStatus).toEqual(AcurastJobStatus.DEPLOYING);
      expect(updatedJob.account).toBeNull();
      expect(updatedJob.publicKey).toBeNull();
    });

    test('should update successful job status and log information', async () => {
      mockGetAcurastEndpoint(getAcurastEndpointMock);
      mockGetJobStatus(getJobStatusMock);
      mockGetAssignedProcessors(getAssignedProcessorsMock);
      mockGetJobPublicKey(getJobPublicKeyMock);

      const jobId = 100;
      await createAcurastJob(stage, jobId);

      await runAcurastJobStatusWorker(stage.context);

      expect(getJobStatusMock).toBeCalledTimes(1);
      expect(getJobStatusMock).toBeCalledWith(DEPLOYER_ADDRESS, jobId);
      expect(getAssignedProcessorsMock).toBeCalledTimes(1);
      expect(getAssignedProcessorsMock).toBeCalledWith(DEPLOYER_ADDRESS, jobId);
      expect(getJobPublicKeyMock).toBeCalledTimes(1);
      expect(getJobPublicKeyMock).toBeCalledWith(
        DEPLOYER_ADDRESS,
        ACCOUNT,
        jobId,
      );

      const updatedJob = await getAcurastJob(stage, jobId);
      expect(updatedJob.jobStatus).toEqual(AcurastJobStatus.MATCHED);
      expect(updatedJob.account).toEqual(ACCOUNT);
      expect(updatedJob.publicKey).toEqual(PUBLIC_KEY);
    });

    test('should handle job without assigned processor gracefully', async () => {
      mockGetAcurastEndpoint(getAcurastEndpointMock);
      mockGetJobStatus(getJobStatusMock, null);

      const jobId = 200;
      await createAcurastJob(stage, jobId);
      await runAcurastJobStatusWorker(stage.context);

      expect(getJobStatusMock).toBeCalledTimes(1);
      expect(getJobStatusMock).toBeCalledWith(DEPLOYER_ADDRESS, jobId);
      expect(getAssignedProcessorsMock).not.toBeCalled();
      expect(getJobPublicKeyMock).not.toBeCalled();

      const updatedJob = await getAcurastJob(stage, jobId);
      expect(updatedJob.jobStatus).toEqual(AcurastJobStatus.DEPLOYED);
      expect(updatedJob.account).toBeNull();
      expect(updatedJob.publicKey).toBeNull();
    });

    test('should log an error if fetching job status fails', async () => {
      mockGetAcurastEndpoint(getAcurastEndpointMock);
      getJobStatusMock.mockImplementationOnce(() => {
        throw new Error('Failed to fetch job status');
      });

      const jobId = 300;
      await createAcurastJob(stage, jobId);
      try {
        await runAcurastJobStatusWorker(stage.context);
      } catch (error) {
        // We expect an error to be thrown, so we catch it here to prevent the test from failing
      }

      expect(getAssignedProcessorsMock).not.toBeCalled();
      expect(getJobPublicKeyMock).not.toBeCalled();

      const updatedJob = await getAcurastJob(stage, jobId);
      expect(updatedJob.jobStatus).toEqual(AcurastJobStatus.DEPLOYED);
      expect(updatedJob.account).toBeNull();
      expect(updatedJob.publicKey).toBeNull();
    });

    test('should update environment variables for new jobs', async () => {
      mockGetAcurastEndpoint(getAcurastEndpointMock);
      mockGetJobStatus(getJobStatusMock);
      mockGetAssignedProcessors(getAssignedProcessorsMock);
      mockGetJobPublicKey(getJobPublicKeyMock);

      const cloudFunctionMock = jest
        .spyOn(CloudFunction.prototype, 'getEnvironmentVariables')
        .mockImplementation(async () => [
          { key: 'ENV_VAR', value: 'test_value' },
        ]);

      const jobId = 400;
      await createAcurastJob(stage, jobId);

      await runAcurastJobStatusWorker(stage.context);

      expect(cloudFunctionMock).toBeCalledTimes(1);
    });

    test('should update previous jobs to INACTIVE after clearPreviousJobs is called', async () => {
      mockGetAcurastEndpoint(getAcurastEndpointMock);
      mockGetJobStatus(getJobStatusMock);
      mockGetAssignedProcessors(getAssignedProcessorsMock);
      mockGetJobPublicKey(getJobPublicKeyMock);

      const clearPreviousJobsSpy = jest.spyOn(
        AcurastJob.prototype,
        'clearPreviousJobs',
      );

      const jobId1 = 500;
      const jobId2 = 501;

      await createAcurastJob(stage, jobId1, AcurastJobStatus.DEPLOYED);
      await createAcurastJob(stage, jobId2, AcurastJobStatus.MATCHED);

      // Run the job status worker
      await runAcurastJobStatusWorker(stage.context);

      // Verify that clearPreviousJobs is called
      expect(clearPreviousJobsSpy).toBeCalledTimes(1);

      // Check that both jobs have been updated to INACTIVE
      const updatedJob1 = await getAcurastJob(stage, jobId1);
      const updatedJob2 = await getAcurastJob(stage, jobId2);

      expect(updatedJob1.jobStatus).toEqual(AcurastJobStatus.INACTIVE);
      expect(updatedJob2.jobStatus).toEqual(AcurastJobStatus.INACTIVE);
    });
  });
});

// HELPERS
function mockGetAcurastEndpoint(getAcurastEndpointMock: jest.SpyInstance) {
  return getAcurastEndpointMock.mockImplementation(async () => ({
    data: { url: ENDPOINT },
  }));
}

function mockGetJobStatus(
  getJobStatusMock: jest.SpyInstance,
  jobState = { assigned: 1 },
) {
  return getJobStatusMock.mockImplementation(async () => jobState);
}

function mockGetAssignedProcessors(
  getAssignedProcessorsMock: jest.SpyInstance,
  account = ACCOUNT,
) {
  return getAssignedProcessorsMock.mockImplementation(async () => account);
}

function mockGetJobPublicKey(
  getJobPublicKeyMock: jest.SpyInstance,
  publicKey = PUBLIC_KEY,
) {
  return getJobPublicKeyMock.mockImplementation(async () => publicKey);
}

async function getAcurastJob(stage: Stage, jobId: number) {
  const data = (
    await stage.context.mysql.paramExecute(
      `SELECT * FROM ${DbTables.ACURAST_JOB} WHERE jobId = ${jobId}`,
    )
  )[0];

  return new AcurastJob(data, stage.context);
}

async function createAcurastJob(
  stage: Stage,
  jobId: number,
  jobStatus = AcurastJobStatus.DEPLOYED,
) {
  await new AcurastJob(
    {
      name: 'Acurast Test Job',
      scriptCid: 'QmUq4iFLKZUpEsHCAqfsBermXHRnPuE5CNcyPv1xaNkyGp',
      startTime: new Date().getTime(),
      endTime: new Date().setHours(new Date().getHours() + 8),
      job_uuid: uuidV4(),
      function_uuid: uuidV4(),
      project_uuid: uuidV4(),
      jobId,
      deployerAddress: DEPLOYER_ADDRESS,
      jobStatus,
    },
    stage.context,
  ).insert();
}
