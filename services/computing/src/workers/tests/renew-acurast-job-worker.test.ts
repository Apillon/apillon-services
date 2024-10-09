import { RenewAcurastJobWorker } from '../renew-acurast-job-worker';
import { AcurastJob } from '../../modules/acurast/models/acurast-job.model';
import { AcurastService } from '../../modules/acurast/acurast.service';
import { ServiceContext } from '@apillon/service-lib';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { LogType, ServiceName, CreateJobDto } from '@apillon/lib';
import { WorkerName } from '../worker-executor';
import { setupTest, Stage } from '../../../test/setup';

async function runRenewAcurastJobWorker(context: ServiceContext) {
  const serviceDef: ServiceDefinition = {
    type: ServiceDefinitionType.LAMBDA,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  };
  const renewWorker = new RenewAcurastJobWorker(
    new WorkerDefinition(serviceDef, WorkerName.RENEW_ACURAST_JOB_WORKER, {}),
    context,
  );
  await renewWorker.runExecutor();
}

describe('RenewAcurastJobWorker Tests', () => {
  let getExpiringTodayMock: jest.SpyInstance;
  let createJobMock: jest.SpyInstance;
  let writeEventLogMock: jest.SpyInstance;
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();

    getExpiringTodayMock = jest.spyOn(AcurastJob.prototype, 'getExpiringToday');
    createJobMock = jest.spyOn(AcurastService, 'createJob');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log the number of expiring jobs to renew', async () => {
    getExpiringTodayMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]); // Mock 2 expiring jobs

    await runRenewAcurastJobWorker(stage.context);

    expect(writeEventLogMock).toHaveBeenCalledWith({
      logType: LogType.INFO,
      message: `Going to renew 2 acurast jobs`,
      service: ServiceName.COMPUTING,
    });
  });

  test('should create a new job for each expiring job', async () => {
    const expiringJob = {
      id: 1,
      jobId: 100,
      deployerAddress: 'deployerAddress',
      function_uuid: 'functionUUID',
    };
    getExpiringTodayMock.mockResolvedValueOnce([expiringJob]);

    await runRenewAcurastJobWorker(stage.context);

    expect(createJobMock).toHaveBeenCalledTimes(1);
    expect(createJobMock).toHaveBeenCalledWith(
      { body: new CreateJobDto(expiringJob) },
      stage.context,
      true,
    );
  });

  test('should handle errors when creating a new job and log the error', async () => {
    const expiringJob = {
      id: 1,
      jobId: 100,
      deployerAddress: 'deployerAddress',
      function_uuid: 'functionUUID',
    };
    getExpiringTodayMock.mockResolvedValueOnce([expiringJob]);

    // Mock an error when creating the job
    createJobMock.mockRejectedValueOnce(new Error('Failed to create job'));

    await runRenewAcurastJobWorker(stage.context);

    expect(createJobMock).toHaveBeenCalledTimes(1);
    expect(writeEventLogMock).toHaveBeenCalledWith({
      logType: LogType.ERROR,
      message: `Error processing job with ID=1`,
      service: ServiceName.COMPUTING,
      err: new Error('Failed to create job'),
    });
  });

  test('should handle the scenario where no jobs are expiring today', async () => {
    getExpiringTodayMock.mockResolvedValueOnce([]); // No expiring jobs

    await runRenewAcurastJobWorker(stage.context);

    expect(createJobMock).not.toHaveBeenCalled();
    expect(writeEventLogMock).toHaveBeenCalledWith({
      logType: LogType.INFO,
      message: `Going to renew 0 acurast jobs`,
      service: ServiceName.COMPUTING,
    });
  });
});
