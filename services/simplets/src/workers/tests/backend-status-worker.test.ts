import {
  Lmas,
  ResourceDeployWebhookDataDto,
  ResourceStatus,
} from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../worker-executor';
import { SimpletDeploy } from '../../modules/simplets/models/simpletDeploy.model';
import { releaseStage, setupTest, Stage } from '../../test/setup';
import { BackendStatusWorker } from '../backend-status.worker';
import { DbTables } from '../../config/types';
import { v4 as uuidV4 } from 'uuid';
import { SimpletsRepository } from '../../modules/simplets/repositores/simplets-repository';

const WORKER_DEFINITION = new WorkerDefinition(
  {
    type: ServiceDefinitionType.SQS,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  },
  WorkerName.BACKEND_STATUS,
  {
    parameters: { FunctionName: 'test' },
  },
);

describe('BackendStatusWorker tests', () => {
  let stage: Stage;
  //let mockRefundCredit: jest.SpyInstance;
  let worker: BackendStatusWorker;
  let simpletRepository: SimpletsRepository;
  let writeEventLogSpy: jest.SpyInstance<
    ReturnType<Lmas['writeLog']>,
    Parameters<Lmas['writeLog']>
  >;

  beforeAll(async () => {
    stage = await setupTest();
    //mockRefundCredit = jest.spyOn(Scs.prototype, 'refundCredit');
  });

  beforeEach(async () => {
    await stage.db.paramExecute(
      `DELETE
       FROM ${DbTables.SIMPLET_DEPLOY};`,
      {},
    );
    jest.clearAllMocks();
    const logger = new Lmas();
    simpletRepository = new SimpletsRepository(stage.context);
    worker = new BackendStatusWorker(
      WORKER_DEFINITION,
      stage.context,
      QueueWorkerType.PLANNER,
      simpletRepository,
      logger,
    );
    writeEventLogSpy = jest.spyOn(logger, 'writeLog');
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Backend Status Worker - Transaction Status Tests', () => {
    test('should update backend status for a valid backend UUID', async () => {
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          backend_uuid: uuidV4(),
          backendStatus: ResourceStatus.DEPLOYING,
          backendUrl: 'https://dummy-backend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          frontend_uuid: null,
          frontendStatus: null,
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: DbTables.SIMPLET_DEPLOY,
            referenceId: simpletDeploy.backend_uuid,
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      //expect(mockRefundCredit).toBeCalledTimes(0);
      await simpletDeploy.reload();
      expect(simpletDeploy.backendStatus).toBe(ResourceStatus.ONLINE);
      expect(writeEventLogSpy).toHaveBeenCalledTimes(0);
    });

    test('should log error when backend UUID does not exist', async () => {
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          backend_uuid: uuidV4(),
          backendStatus: ResourceStatus.DEPLOYING,
          backendUrl: 'https://dummy-backend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          frontend_uuid: null,
          frontendStatus: null,
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: DbTables.SIMPLET_DEPLOY,
            referenceId: 'bad_backend_uuid',
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      await simpletDeploy.reload();
      expect(simpletDeploy.backendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        data: { backend_uuid: 'bad_backend_uuid' },
        location: 'BackendStatusWorker',
        logType: 'ERROR',
        message:
          '[BackendStatusWorker]: Backend with uuid bad_backend_uuid not found.',
        project_uuid: undefined,
        service: 'SIMPLETS',
      });
    });

    test('should log error when unexpected error occurs', async () => {
      jest
        .spyOn(simpletRepository, 'getSimpletDeployByBackend')
        .mockRejectedValueOnce({});
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          backend_uuid: uuidV4(),
          backendStatus: ResourceStatus.DEPLOYING,
          backendUrl: 'https://dummy-backend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          frontend_uuid: null,
          frontendStatus: null,
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: DbTables.SIMPLET_DEPLOY,
            referenceId: simpletDeploy.backend_uuid,
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      await simpletDeploy.reload();
      expect(simpletDeploy.backendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        data: { backend_uuid: simpletDeploy.backend_uuid },
        location: 'BackendStatusWorker',
        logType: 'ERROR',
        message: `[BackendStatusWorker]: An error occurred while processing backend with uuid ${simpletDeploy.backend_uuid}.`,
        project_uuid: undefined,
        service: 'SIMPLETS',
      });
    });
  });
});
