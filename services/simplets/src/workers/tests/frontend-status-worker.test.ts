import {
  AWS_KMS,
  DeployMicroservice,
  EncryptionService,
  env,
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
import { FrontendStatusWorker } from '../frontend-status.worker';
import { DbTables } from '../../config/types';
import { v4 as uuidV4 } from 'uuid';
import { SimpletsRepository } from '../../modules/simplets/repositores/simplets-repository';
import { ResourceType } from '../../modules/simplets/types';

const TEST_BACKEND_SECRETS = [
  {
    key: 'ENV_VARIABLE_NAME',
    value: 'ENV_VARIABLE_VALUE',
  },
];

const WORKER_DEFINITION = new WorkerDefinition(
  {
    type: ServiceDefinitionType.SQS,
    config: { region: 'test' },
    params: { FunctionName: 'test' },
  },
  WorkerName.FRONTEND_STATUS,
  {
    parameters: { FunctionName: 'test' },
  },
);

describe('FrontendStatusWorker tests', () => {
  let stage: Stage;
  //let mockRefundCredit: jest.SpyInstance;
  let worker: FrontendStatusWorker;
  let simpletRepository: SimpletsRepository;
  let deployService: DeployMicroservice;
  let awsKms: AWS_KMS;
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
    awsKms = new AWS_KMS();
    jest
      .spyOn(awsKms, 'encrypt')
      .mockImplementation(async () => 'encrypted_string');
    jest
      .spyOn(awsKms, 'decrypt')
      .mockImplementation(async () => JSON.stringify(TEST_BACKEND_SECRETS));
    deployService = new DeployMicroservice(stage.context);
    jest
      .spyOn(deployService, 'redeployDockerCompose')
      .mockResolvedValue({ success: true });

    worker = new FrontendStatusWorker(
      WORKER_DEFINITION,
      stage.context,
      QueueWorkerType.PLANNER,
      simpletRepository,
      deployService,
      new EncryptionService(awsKms, env.DEPLOY_KMS_KEY_ID),
      logger,
    );

    writeEventLogSpy = jest.spyOn(logger, 'writeLog');
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Frontend Status Worker - Transaction Status Tests', () => {
    test('should update frontend status for a valid frontend UUID', async () => {
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          frontend_uuid: uuidV4(),
          frontendStatus: ResourceStatus.DEPLOYING,
          frontendUrl: 'https://dummy-frontend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          backend_uuid: null,
          backendStatus: null,
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: ResourceType.FRONTEND,
            referenceId: simpletDeploy.frontend_uuid,
            resourceStatus: ResourceStatus.FAILED,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      //expect(mockRefundCredit).toBeCalledTimes(0);
      await simpletDeploy.reload();
      expect(simpletDeploy.frontendStatus).toBe(ResourceStatus.FAILED);
      expect(writeEventLogSpy).toHaveBeenCalledTimes(0);
      expect(deployService.redeployDockerCompose).toHaveBeenCalledTimes(0);
    });

    test('should update frontend status and trigger backend redeploy', async () => {
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          frontend_uuid: uuidV4(),
          frontendStatus: ResourceStatus.DEPLOYING,
          frontendUrl: 'https://dummy-frontend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          backend_uuid: null,
          backendStatus: null,
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
          backendDockerCompose: 'DOCKER_COMPOSE_CONTENT',
          backendVariables: 'ENCRYPTED_BACKEND_VARIABLES',
          backendVirtualMachine: {},
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: ResourceType.FRONTEND,
            referenceId: simpletDeploy.frontend_uuid,
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      //expect(mockRefundCredit).toBeCalledTimes(0);
      await simpletDeploy.reload();
      expect(simpletDeploy.frontendStatus).toBe(ResourceStatus.ONLINE);
      expect(writeEventLogSpy).toHaveBeenCalledTimes(0);
      expect(deployService.redeployDockerCompose).toBeCalledWith({
        backend_uuid: simpletDeploy.backend_uuid,
        dockerCompose: simpletDeploy.backendDockerCompose,
        secrets: [
          ...TEST_BACKEND_SECRETS,
          {
            key: 'APP_URL',
            value: '{"key":"value"}',
          },
        ],
        virtualMachine: simpletDeploy.backendVirtualMachine,
      });
    });

    test('should skip processing when referenceTable is not frontend', async () => {
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          frontend_uuid: uuidV4(),
          frontendStatus: ResourceStatus.DEPLOYING,
          frontendUrl: 'https://dummy-frontend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          backend_uuid: null,
          backendStatus: null,
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: ResourceType.BACKEND,
            referenceId: simpletDeploy.frontend_uuid,
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      await simpletDeploy.reload();
      expect(simpletDeploy.frontendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(writeEventLogSpy).toHaveBeenCalledTimes(0);
      expect(deployService.redeployDockerCompose).toHaveBeenCalledTimes(0);
    });

    test('should log error when frontend UUID does not exist', async () => {
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          frontend_uuid: uuidV4(),
          frontendStatus: ResourceStatus.DEPLOYING,
          frontendUrl: 'https://dummy-frontend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          backend_uuid: null,
          backendStatus: null,
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: ResourceType.FRONTEND,
            referenceId: 'bad_frontend_uuid',
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      await simpletDeploy.reload();
      expect(simpletDeploy.frontendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        data: { frontend_uuid: 'bad_frontend_uuid' },
        location: 'FrontendStatusWorker',
        logType: 'ERROR',
        message:
          '[FrontendStatusWorker]: Frontend with uuid bad_frontend_uuid not found.',
        project_uuid: undefined,
        service: 'SIMPLETS',
      });
      expect(deployService.redeployDockerCompose).toHaveBeenCalledTimes(0);
    });

    test('should log error when unexpected error occurs', async () => {
      jest
        .spyOn(simpletRepository, 'getSimpletDeployByFrontend')
        .mockRejectedValueOnce({});
      const simpletDeploy = await new SimpletDeploy(
        {
          project_uuid: uuidV4(),
          simpletDeploy_uuid: uuidV4(),
          simplet_uuid: uuidV4(),
          name: 'name',
          description: 'description',
          frontend_uuid: uuidV4(),
          frontendStatus: ResourceStatus.DEPLOYING,
          frontendUrl: 'https://dummy-frontend-url.com',
          contract_uuid: null,
          contractStatus: null,
          contractChain: null,
          contractChainType: null,
          contractAddress: null,
          backend_uuid: null,
          backendStatus: null,
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
        stage.context,
      ).insert();

      await worker.runExecutor({
        data: [
          new ResourceDeployWebhookDataDto({}, stage.context).populate({
            referenceTable: ResourceType.FRONTEND,
            referenceId: simpletDeploy.frontend_uuid,
            resourceStatus: ResourceStatus.ONLINE,
            data: JSON.stringify({ key: 'value' }),
          }),
        ],
      });

      await simpletDeploy.reload();
      expect(simpletDeploy.frontendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(writeEventLogSpy).toHaveBeenCalledWith({
        data: {
          frontend_uuid: simpletDeploy.frontend_uuid,
          error: undefined,
          stack: undefined,
        },
        location: 'FrontendStatusWorker',
        logType: 'ERROR',
        message: `[FrontendStatusWorker]: An error occurred while processing frontend with uuid ${simpletDeploy.frontend_uuid}.`,
        project_uuid: undefined,
        service: 'SIMPLETS',
      });
      expect(deployService.redeployDockerCompose).toHaveBeenCalledTimes(0);
    });
  });
});
