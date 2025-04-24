import { releaseStage, setupTest, Stage } from '../../../test/setup';
import {
  BaseQueryFilter,
  DeployEventType,
  DeployInstanceDto,
  DeployMSEventType,
  Lmas,
  ResourceStatus,
} from '@apillon/lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import { processEvent } from '../../../main';
import { PhalaDockerDeployStrategy } from '../services/phala-docker-deploy.strategy';
import { PhalaCloudClient } from '../clients/phala-cloud.client';
import { BackendController } from '../backend.controller';
import { DeployRepository } from '../repositores/deploy-repository';
import { BackendStrategyHandler } from '../backendStrategy.handler';
import { ServiceContext } from '@apillon/service-lib';
import { Backend } from '../models/backend.model';
import { VMStatus } from '../types';
import { DbTables } from '../../../config/types';

const dockerCompose = readFileSync(
  join(__dirname, './fixtures/docker-compose.yml'),
  'utf8',
);

const TEST_PROJECT_UUID = 'dummyProjectUuid';
const TEST_APP_PUBLIC_KEY =
  'bebf02374be0f7b44084c1cb284dad8a3d85ad3c756ac373cf9add49d7e67f12';
const TEST_APP_SALT = '2f974ae3-a621-4479-b6d8-89f8e1703bfb';
const TEST_BACKEND_DATA = {
  project_uuid: 'dummy-project-uuid',
  backend_uuid: 'dummy-backend-uuid',
  backendStatus: ResourceStatus.REQUESTED,
  name: 'dummy-backend-name',
  description: 'dummy-backend-description',
  instanceId: 'dummy-instance-id',
  url: 'https://dummy-url.com',
  data: {
    key1: 'dummy-value-key1',
    key2: 'dummy-value-key2',
  },
};
const TEST_INSTANCE_DETAILS_RESPONSE = {
  id: 'dummy-id',
  status: VMStatus.RUNNING, // Replace with appropriate VMStatus if needed
  createdAt: '2025-04-09T10:31:25.675Z',
  updatedAt: '2025-04-09T10:31:25.675Z',
  configuration: {
    cpu: '4 cores',
    ram: '8 GB',
    storage: '100 GB SSD',
  },
};
const TEST_INSTANCE_CREATE_RESPONSE = {
  id: 'sample-id',
  name: 'sample-name',
  status: VMStatus.RUNNING,
  teepod_id: 123,
  teepod: {
    id: 123,
    name: 'sample-teepod',
  },
  user_id: 456,
  app_id: 'sample-app-id',
  vm_uuid: 'sample-vm-uuid',
  instance_id: null,
  app_url: 'https://sample-app-url.com',
  base_image: 'sample-base-image',
  vcpu: 4,
  memory: 8192,
  disk_size: 100,
  manifest_version: 1,
  version: '1.0.0',
  runner: 'sample-runner',
  docker_compose_file: 'sample-docker-compose.yml',
  features: ['feature1', 'feature2'],
  created_at: '2025-04-09T10:31:25.675Z',
  encrypted_env_pubkey: 'sample-encrypted-env-pubkey',
};

const TEST_RESPONSE_2 = {
  app_id: 'sample-app-id',
  app_url: 'https://sample-app-url.com',
  base_image: 'sample-base-image',
  created_at: '2025-04-09T10:31:25.675Z',
  disk_size: 100,
  docker_compose_file: 'sample-docker-compose.yml',
  encrypted_env_pubkey: 'sample-encrypted-env-pubkey',
  features: ['feature1', 'feature2'],
  id: 'sample-id',
  instance_id: null,
  manifest_version: 1,
  memory: 8192,
  name: 'sample-name',
  runner: 'sample-runner',
  status: 'running',
  teepod: {
    id: 123,
    name: 'sample-teepod',
  },
  teepod_id: 123,
  user_id: 456,
  vcpu: 4,
  version: '1.0.0',
  vm_uuid: 'sample-vm-uuid',
};

describe('DeployService tests', () => {
  let stage: Stage;
  let context: ServiceContext;
  let phalaClient: PhalaCloudClient;
  let backendController: BackendController;
  let createInstanceMock: jest.SpyInstance;

  beforeAll(async () => {
    stage = await setupTest();
    context = stage.context;
  });
  afterAll(async () => {
    await releaseStage(stage);
  });
  beforeEach(async () => {
    await stage.db.paramExecute(
      `DELETE
       FROM ${DbTables.BACKEND};`,
      {},
    );
    jest.clearAllMocks();
    const logger = new Lmas();
    jest.spyOn(logger, 'writeLog');
    phalaClient = new PhalaCloudClient(
      'DEPLOY_PHALA_CLOUD_API_URL',
      'DEPLOY_PHALA_CLOUD_API_KEY',
    );
    backendController = new BackendController(
      new DeployRepository(context),
      new BackendStrategyHandler(
        context,
        new PhalaDockerDeployStrategy(phalaClient),
        logger,
      ),
    );
  });

  describe('Backend Deploys', () => {
    beforeEach(async () => {
      jest.spyOn(phalaClient, 'getAvailablePods').mockResolvedValueOnce({
        nodes: [
          {
            teepod_id: 456,
            images: [
              { name: 'image3', version: [3, 0, 0], is_dev: true },
              { name: 'image4', version: [4, 0, 0], is_dev: true },
            ],
          },
          {
            teepod_id: 123,
            images: [
              { name: 'image1', version: [1, 0, 0], is_dev: false },
              { name: 'image2', version: [2, 3, 1], is_dev: false },
            ],
          },
        ],
      });
      jest.spyOn(phalaClient, 'getPublicKey').mockResolvedValueOnce({
        app_env_encrypt_pubkey: TEST_APP_PUBLIC_KEY,
        app_id_salt: TEST_APP_SALT,
      });
      createInstanceMock = jest
        .spyOn(phalaClient, 'createCVM')
        .mockResolvedValueOnce(TEST_INSTANCE_CREATE_RESPONSE);
    });

    it('User can deploy docker compose', async () => {
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_DEPLOY_DOCKER_COMPOSE,
        body: new DeployInstanceDto({}, stage.context).populate({
          project_uuid: TEST_PROJECT_UUID,
          name: 'Name',
          description: 'Description',
          dockerCompose,
          secrets: [{ key: 'SECRET_1', value: 'SECRET_1_VALUE' }],
          virtualMachine: { memory: 4096, cpuCount: 1, diskSize: 20 },
        }),
      };
      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toMatchObject({
        createTime: expect.any(Date),
        updateTime: null,
        project_uuid: 'dummyProjectUuid',
        backend_uuid: expect.any(String),
        backendStatus: 2,
        name: 'Name (Backend)',
        instanceId: 'sample-app-id',
        url: 'https://sample-app-id-80.dstack-prod5.phala.network',
        data: {
          appId: 'sample-app-id',
          id: 'sample-id',
          name: 'sample-name',
          status: 'running',
          teepodId: 123,
          teepod: {
            id: 123,
            name: 'sample-teepod',
          },
          userId: 456,
          vmUuid: 'sample-vm-uuid',
          instanceId: null,
          appUrl: 'https://sample-app-url.com',
          baseImage: 'sample-base-image',
          vcpu: 4,
          memory: 8192,
          diskSize: 100,
          manifestVersion: 1,
          version: '1.0.0',
          runner: 'sample-runner',
          dockerComposeFile: 'sample-docker-compose.yml',
          features: ['feature1', 'feature2'],
          createdAt: expect.any(String),
          encryptedEnvPubkey: 'sample-encrypted-env-pubkey',
          dashboardUrl:
            'https://cloud.phala.network/dashboard/cvms/app_sample-app-id',
        },
      });
      const backends = await stage.db.paramExecute(
        `SELECT *
         FROM ${DbTables.BACKEND}
         where backend_uuid = @uuid;`,
        { uuid: response.backend_uuid },
      );
      expect(backends.length).toBe(1);
      expect(backends[0].backendStatus).toBe(2);
      expect(createInstanceMock).toHaveBeenCalledWith({
        name: expect.any(String),
        image: 'image4',
        teepod_id: 456,
        compose_manifest: {
          name: expect.any(String),
          features: ['kms', 'tproxy-net'],
          docker_compose_file:
            "services:\n  poa_db:\n    image: mysql\n    container_name: poa_db\n    environment:\n      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}\n      MYSQL_DATABASE: ${MYSQL_DATABASE}\n    ports:\n      - '3306:3306'\n    restart: always\n    networks:\n      - app-network\n\n  poa_app:\n    image: tadej/ps-poa:latest\n    container_name: poa_app\n    depends_on:\n      - poa_db\n    environment:\n      MYSQL_PASSWORD: ${MYSQL_ROOT_PASSWORD}\n      ADMIN_WALLET: ${ADMIN_WALLET}\n      APILLON_KEY: ${APILLON_KEY}\n      APILLON_SECRET: ${APILLON_SECRET}\n      SMTP_HOST: ${SMTP_HOST}\n      SMTP_PORT: ${SMTP_PORT}\n      SMTP_USERNAME: ${SMTP_USERNAME}\n      SMTP_PASSWORD: ${SMTP_PASSWORD}\n      SMTP_NAME_FROM: ${SMTP_NAME_FROM}\n      SMTP_EMAIL_FROM: ${SMTP_EMAIL_FROM}\n    ports:\n      - '80:3000'\n    expose:\n      - '80'\n    restart: always\n    networks:\n      - app-network\nnetworks:\n  app-network:\n    driver: bridge\n",
        },
        vcpu: 1,
        memory: 4096,
        disk_size: 20,
        advanced_features: {
          tproxy: true,
          kms: true,
          public_sys_info: true,
          public_logs: false,
          docker_config: {
            username: '',
            password: '',
            registry: null,
          },
          listed: false,
        },
        encrypted_env: expect.any(String),
        app_env_encrypt_pubkey: TEST_APP_PUBLIC_KEY,
        app_id_salt: TEST_APP_SALT,
      });
    });
  });

  describe('Backend Interactions', () => {
    let backend: Backend;
    beforeEach(async () => {
      backend = await new Backend({}, context)
        .populate(TEST_BACKEND_DATA)
        .insert();
    });
    it('should list backends', async () => {
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_LIST_BACKENDS,
        body: new BaseQueryFilter({}, context).populate({
          // page: 1,
          // limit: 20,
          // orderBy: [],
          // desc: [],
          // search: '',
          // status: backend.status,
        }),
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response.total).toBe(1);
      expect(response.items.length).toBe(1);
      expect(response.items[0].backend_uuid).toBe(backend.backend_uuid);
      expect(response.items[0].url).toBe(backend.url);
    });

    it('should get backend instance', async () => {
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_GET_INSTANCE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response.backend_uuid).toBe(backend.backend_uuid);
      expect(response.backendStatus).toBe(backend.backendStatus);
    });

    it('should get backend instance details', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'getCVMDetails')
        .mockResolvedValueOnce(TEST_INSTANCE_DETAILS_RESPONSE);
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_GET_INSTANCE_DETAILS,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual({
        id: 'dummy-id',
        status: 'running',
        createdAt: TEST_INSTANCE_DETAILS_RESPONSE.createdAt,
        updatedAt: TEST_INSTANCE_DETAILS_RESPONSE.updatedAt,
        configuration: {
          cpu: '4 cores',
          ram: '8 GB',
          storage: '100 GB SSD',
        },
      });
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should get backend instance stats', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'getCVMStats')
        .mockResolvedValueOnce({
          cpuUsage: 45.6,
          memoryUsage: 68.2,
          diskUsage: 79.3,
          networkTraffic: {
            inbound: 1234567,
            outbound: 987654,
          },
          uptime: '3 days, 4 hours, 21 minutes',
          processes: 182,
          isOnline: true,
          isPublic: false,
          error: null,
          sysinfo: {
            osName: 'Linux',
            osVersion: '5.15.0-50-generic',
            kernelVersion: '5.15.0',
            cpuModel: 'Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz',
            numCpus: 8,
            totalMemory: 32768,
            availableMemory: 16384,
            usedMemory: 8192,
            freeMemory: 8192,
            totalSwap: 8192,
            usedSwap: 2048,
            freeSwap: 6144,
            uptime: 259200,
            loadavgOne: 0.15,
            loadavgFive: 0.1,
            loadavgFifteen: 0.05,
            disks: [
              {
                name: '/dev/sda1',
                mountPoint: '/',
                totalSize: 100000,
                freeSize: 25000,
              },
              {
                name: '/dev/sdb1',
                mountPoint: '/data',
                totalSize: 200000,
                freeSize: 150000,
              },
            ],
          },
        });

      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_GET_INSTANCE_STATE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual({
        cpuUsage: 45.6,
        diskUsage: 79.3,
        error: null,
        isOnline: true,
        isPublic: false,
        memoryUsage: 68.2,
        networkTraffic: {
          inbound: 1234567,
          outbound: 987654,
        },
        processes: 182,
        sysinfo: {
          availableMemory: 16384,
          cpuModel: 'Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz',
          disks: [
            {
              freeSize: 25000,
              mountPoint: '/',
              name: '/dev/sda1',
              totalSize: 100000,
            },
            {
              freeSize: 150000,
              mountPoint: '/data',
              name: '/dev/sdb1',
              totalSize: 200000,
            },
          ],
          freeMemory: 8192,
          freeSwap: 6144,
          kernelVersion: '5.15.0',
          loadavgFifteen: 0.05,
          loadavgFive: 0.1,
          loadavgOne: 0.15,
          numCpus: 8,
          osName: 'Linux',
          osVersion: '5.15.0-50-generic',
          totalMemory: 32768,
          totalSwap: 8192,
          uptime: 259200,
          usedMemory: 8192,
          usedSwap: 2048,
        },
        uptime: '3 days, 4 hours, 21 minutes',
      });
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should start backend instance', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'startCVM')
        .mockResolvedValueOnce(TEST_INSTANCE_CREATE_RESPONSE);
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_START_INSTANCE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual(TEST_RESPONSE_2);
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should handle shutdown backend instance', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'shutdownCVM')
        .mockResolvedValueOnce(TEST_INSTANCE_CREATE_RESPONSE);
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_SHUTDOWN_INSTANCE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual(TEST_RESPONSE_2);
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should stop backend instance', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'stopCVM')
        .mockResolvedValueOnce(TEST_INSTANCE_CREATE_RESPONSE);
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_STOP_INSTANCE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual(TEST_RESPONSE_2);
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should restart backend instance', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'restartCVM')
        .mockResolvedValueOnce(TEST_INSTANCE_CREATE_RESPONSE);
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_RESTART_INSTANCE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual(TEST_RESPONSE_2);
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should destroy backend instance', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'destroyCVM')
        .mockResolvedValueOnce();
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_DESTROY_INSTANCE,
        body: { deploy_uuid: backend.backend_uuid },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual(true);
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId);
    });

    it('should resize backend instance', async () => {
      const mockedMethod = jest
        .spyOn(phalaClient, 'resizeCVM')
        .mockResolvedValueOnce('ok');
      const event: DeployMSEventType = {
        eventName: DeployEventType.BE_RESIZE_INSTANCE,
        body: {
          deploy_uuid: backend.backend_uuid,
          allowRestart: true,
          cpuCount: 2,
          memory: 2048,
          diskSize: 10,
        },
      };

      const response = await processEvent(
        event,
        stage.context,
        backendController,
      );

      expect(response).toStrictEqual(true);
      expect(mockedMethod).toHaveBeenCalledWith(backend.instanceId, {
        allow_restart: 1,
        disk_size: 10,
        memory: 2048,
        vcpu: 2,
      });
    });
  });
});
