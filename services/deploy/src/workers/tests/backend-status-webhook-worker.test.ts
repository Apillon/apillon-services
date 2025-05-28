import {
  AWS_KMS,
  EncryptionService,
  env,
  Lmas,
  ResourceStatus,
} from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
  WorkerService,
} from '@apillon/workers-lib';
import { WorkerName } from '../worker-executor';
import { releaseStage, setupTest, Stage } from '../../test/setup';
import { v4 as uuidV4 } from 'uuid';
import { BackendStatusWebhookWorker } from '../backend-status-webhook.worker';
import { PhalaCloudClient } from '../../modules/deploy/clients/phala-cloud.client';
import { Backend } from '../../modules/deploy/models/backend.model';
import { VMStatus } from '../../modules/deploy/types';
import { DeployRepository } from '../../modules/deploy/repositores/deploy-repository';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DbTables } from '../../config/types';

const WORKER_DEFINITION = new WorkerDefinition(
  {
    type: ServiceDefinitionType.SQS,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  },
  WorkerName.BACKEND_STATUS_WORKER,
  {
    parameters: { FunctionName: 'test' },
  },
);

const PROJECT_UUID = 'project-uuid';

describe('Log worker tests', () => {
  let stage: Stage;
  //let mockRefundCredit: jest.SpyInstance;
  let worker: BackendStatusWebhookWorker;
  let phalaClient: PhalaCloudClient;
  let sqsClient: SQSClient;
  let logger: Lmas;
  let sqsSendSpy: jest.SpyInstance;
  beforeAll(async () => {
    stage = await setupTest();
    //mockRefundCredit = jest.spyOn(Scs.prototype, 'refundCredit');
  });

  beforeEach(async () => {
    await stage.db.paramExecute(
      `DELETE
       FROM ${DbTables.BACKEND};`,
      {},
    );
    jest.clearAllMocks();
    phalaClient = new PhalaCloudClient(
      env.DEPLOY_PHALA_CLOUD_API_URL,
      env.DEPLOY_PHALA_CLOUD_API_KEY,
    );
    sqsClient = new SQSClient();
    sqsSendSpy = jest.spyOn(sqsClient, 'send').mockImplementation(() => {
      return {
        catch: jest.fn(),
      };
    });
    logger = new Lmas();
    worker = new BackendStatusWebhookWorker(
      WORKER_DEFINITION,
      stage.context,
      QueueWorkerType.PLANNER,
      new DeployRepository(
        stage.context,
        new EncryptionService(new AWS_KMS(), 'key'),
      ),
      phalaClient,
      new WorkerService(sqsClient),
      logger,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Backend Status Worker - Transaction Status Tests', () => {
    test('should fetch backends and update their status successfully', async () => {
      const writeEventLogSpy = jest.spyOn(logger, 'writeLog');
      const backendStatuses = [
        {
          initialStatus: ResourceStatus.REQUESTED,
          phalaVmStatus: VMStatus.CREATING,
          expectedStatus: ResourceStatus.REQUESTED,
        },
        {
          initialStatus: ResourceStatus.REQUESTED,
          phalaVmStatus: VMStatus.STARTING,
          expectedStatus: ResourceStatus.DEPLOYING,
        },
        {
          initialStatus: ResourceStatus.REQUESTED,
          phalaVmStatus: VMStatus.RUNNING,
          expectedStatus: ResourceStatus.ONLINE,
        },
        // start from ResourceStatus.ONLINE
        {
          initialStatus: ResourceStatus.ONLINE,
          phalaVmStatus: VMStatus.RUNNING,
          expectedStatus: ResourceStatus.ONLINE,
        },
        {
          initialStatus: ResourceStatus.ONLINE,
          phalaVmStatus: VMStatus.STOPPED,
          expectedStatus: ResourceStatus.STOPPED,
        },
        {
          initialStatus: ResourceStatus.ONLINE,
          phalaVmStatus: VMStatus.EXITED,
          expectedStatus: ResourceStatus.SHUT_DOWN,
        },
      ];
      const backendDeploys = [];
      for (const backendStatus of backendStatuses) {
        const backendDeploy = await new Backend({}, stage.context)
          .populate({
            backend_uuid: uuidV4(),
            backendStatus: backendStatus.initialStatus,
            instanceId: `instance-id-${backendStatuses.indexOf(backendStatus) + 1}`,
            name: `name-${backendStatuses.indexOf(backendStatus) + 1}`,
            url: `url-${backendStatuses.indexOf(backendStatus) + 1}`,
            project_uuid: PROJECT_UUID,
          })
          .insert();
        backendDeploys.push(backendDeploy);
      }
      backendDeploys.forEach((backend, index) => {
        jest.spyOn(phalaClient, 'getCVMDetails').mockResolvedValueOnce({
          status: backendStatuses[index].phalaVmStatus,
          id: backend.instanceId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          configuration: {
            key: 'value',
            dummy: true,
          },
        });
      });

      const result = await worker.runExecutor({});

      expect(result).toBe(true);
      expect(sqsSendSpy).toHaveBeenCalledTimes(1);
      expect(writeEventLogSpy).toHaveBeenCalledTimes(2);
      // TODO: better assertion
      // expect(writeEventLogSpy).toHaveBeenCalledWith([
      //   {
      //     logType: 'INFO',
      //     message: expect.stringContaining(
      //       '[BackendStatusWorker]: Skipping backend update for uuid:',
      //     ),
      //     location: 'BackendStatusWorker',
      //     service: 'DEPLOY',
      //     project_uuid: undefined,
      //     data: {
      //       backend_uuid: expect.any(String),
      //       instanceId: 'instance-id-1',
      //       backendStatus: 0,
      //     },
      //   },
      //
      //   {
      //     logType: 'INFO',
      //     message:
      //       '[BackendStatusWorker]: Triggered webhooks for 1 backend deploys!',
      //     location: 'BackendStatusWorker',
      //     service: 'DEPLOY',
      //     project_uuid: undefined,
      //     data: {
      //       updates: [expect.arrayContaining(expect.any(String))],
      //     },
      //   },
      // ]);
      const finalBackendStatuses = [];
      for (const backend of backendDeploys) {
        const { backendStatus } = await backend.reload();
        finalBackendStatuses.push(backendStatus);
      }
      expect(finalBackendStatuses).toStrictEqual(
        backendStatuses.map((b) => b.expectedStatus),
      );
    });

    test('should handle scenario when no backends are available for status update', async () => {
      const writeEventLogSpy = jest.spyOn(logger, 'writeLog');
      const result = await worker.runExecutor({});

      expect(result).toBe(true);
      expect(sqsSendSpy).toHaveBeenCalledTimes(0);
      expect(writeEventLogSpy).toHaveBeenCalledTimes(0);
    });

    test('should handle errors when fetching backend details', async () => {
      const backendDeploy = await new Backend({}, stage.context)
        .populate({
          backend_uuid: uuidV4(),
          backendStatus: ResourceStatus.REQUESTED,
          instanceId: 'instance-id',
          name: 'name',
          url: 'url',
          project_uuid: PROJECT_UUID,
        })
        .insert();
      jest
        .spyOn(phalaClient, 'getCVMDetails')
        .mockRejectedValueOnce(new Error('CVM Details fetch failed'));
      const writeEventLogSpy = jest.spyOn(logger, 'writeLog');

      const result = await worker.runExecutor({});

      expect(result).toBe(true);
      expect(sqsSendSpy).toHaveBeenCalledTimes(0);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          backend_uuid: expect.any(String),
          error: expect.any(Error),
        }),
        location: 'BackendStatusWorker',
        logType: 'ERROR',
        message: expect.stringContaining(
          '[BackendStatusWorker]: Error updating backend deploy for uuid:',
        ),
        project_uuid: undefined,
        service: 'DEPLOY',
      });
      await backendDeploy.reload();
      expect(backendDeploy.backendStatus).toBe(ResourceStatus.REQUESTED);
    });

    test('should handle scenario where one of the backends has invalid instanceId', async () => {
      const backendDeploy = await new Backend({}, stage.context)
        .populate({
          backend_uuid: uuidV4(),
          backendStatus: ResourceStatus.REQUESTED,
          instanceId: 'invalid_instance_id', // Invalid instanceId
          name: 'name',
          url: 'url',
          project_uuid: PROJECT_UUID,
        })
        .insert();
      const writeEventLogSpy = jest.spyOn(logger, 'writeLog');
      const payload = {
        response: {
          status: 404,
          data: 'Not Found',
        },
      };
      jest.spyOn(phalaClient, 'getCVMDetails').mockRejectedValueOnce(payload);

      const result = await worker.runExecutor({});

      expect(result).toBe(true);
      expect(sqsSendSpy).toHaveBeenCalledTimes(0);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        logType: 'ERROR',
        message: `[BackendStatusWorker]: Error updating backend deploy for uuid: ${backendDeploy.backend_uuid}`,
        location: 'BackendStatusWorker',
        service: 'DEPLOY',
        data: {
          backend_uuid: backendDeploy.backend_uuid,
          error: payload,
        },
        project_uuid: undefined,
      });
    });

    test('should handle case where backend is already online and was stopped', async () => {
      const backendDeploy = await new Backend({}, stage.context)
        .populate({
          backend_uuid: uuidV4(),
          backendStatus: ResourceStatus.ONLINE,
          instanceId: 'instance-id',
          name: 'name-online',
          url: 'url-online',
          project_uuid: PROJECT_UUID,
        })
        .insert();

      jest.spyOn(phalaClient, 'getCVMDetails').mockResolvedValueOnce({
        status: VMStatus.STOPPED,
        id: backendDeploy.instanceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        configuration: {
          key: 'value',
          dummy: true,
        },
      });
      const writeEventLogSpy = jest.spyOn(logger, 'writeLog');

      const result = await worker.runExecutor({});

      expect(result).toBe(true);
      expect(sqsSendSpy).toHaveBeenCalledTimes(1);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        location: 'BackendStatusWorker',
        logType: 'INFO',
        message:
          '[BackendStatusWorker]: Triggered webhooks for 1 backend deploys!',
        service: 'DEPLOY',
        project_uuid: undefined,
        data: expect.objectContaining({
          updates: [[backendDeploy.backend_uuid]],
        }),
      });
      await backendDeploy.reload();
      expect(backendDeploy.backendStatus).toBe(ResourceStatus.STOPPED);
    });
  });
});
