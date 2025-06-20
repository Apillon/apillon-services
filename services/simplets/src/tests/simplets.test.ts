import {
  AuthenticationMicroservice,
  AWS_KMS,
  ChainType,
  DeployMicroservice,
  EncryptionService,
  env,
  EvmChain,
  Lmas,
  Mailing,
  NFTCollectionType,
  NftsMicroservice,
  ResourceStatus,
  Scs,
  SimpletsEventType,
  StorageMicroservice,
  WebsiteSource,
} from '@apillon/lib';
import { SimpletsService } from '../modules/simplets/services/simplets.service';
import { SimpletsRepository } from '../modules/simplets/repositores/simplets-repository';
import { SimpletsSpendService } from '../modules/simplets/services/simplets-spend.service';
import { setupTest, Stage } from '../test/setup';
import { processEvent } from '../main';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletsController } from '../modules/simplets/simplets.controller';
import { SimpletDeploy } from '../modules/simplets/models/simpletDeploy.model';
import { Simplet } from '../modules/simplets/models/simplet.model';
import { DbTables } from '../config/types';
import { CollectionStatus } from '@apillon/nfts/dist/config/types';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { WebsiteDomainStatus } from '@apillon/storage/src/config/types';

const axiosMock = new MockAdapter(axios);

const TEST_PROJECT_UUID = 'dummyProjectUuid';
const TEST_SIMPLET_UUID = 'dummySimpletUuid';
const TEST_SIMPLET_UUID_2 = 'dummySimpletUuid2';
const TEST_BACKEND_UUID = 'dummyBackendUuid';
const TEST_NFT_COLLECTION_UUID = 'dummyNftCollectionUuid';
const TEST_WEBSITE_UUID = 'dummyWebsiteUuid';

const dockerComposePath = path.resolve(
  __dirname,
  './fixtures/docker-compose.yml',
);
const TEST_DOCKER_COMPOSE_CONTENT = fs.readFileSync(dockerComposePath, 'utf-8');

describe('Simplets controller', () => {
  let stage: Stage;
  let context: ServiceContext;
  let controller: SimpletsController;
  let deployMicroservice: DeployMicroservice;
  let nftsMicroservice: NftsMicroservice;
  let authenticationMicroservice: AuthenticationMicroservice;
  let storageMicroservice: StorageMicroservice;
  beforeAll(async () => {
    stage = await setupTest();
    context = stage.context;
    //mockRefundCredit = jest.spyOn(Scs.prototype, 'refundCredit');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const logger = new Lmas();
    jest.spyOn(logger, 'writeLog');
    await stage.db.paramExecute(
      `DELETE
       FROM ${DbTables.SIMPLET};`,
      {},
    );
    await stage.db.paramExecute(
      `DELETE
       FROM ${DbTables.SIMPLET_DEPLOY};`,
      {},
    );
    const simpletsRepository = new SimpletsRepository(context);
    deployMicroservice = new DeployMicroservice(context);
    storageMicroservice = new StorageMicroservice(context);
    nftsMicroservice = new NftsMicroservice(context);
    authenticationMicroservice = new AuthenticationMicroservice(context);
    const spendService = new SimpletsSpendService(context);
    const mailing = new Mailing(context);
    const simpletsService = new SimpletsService(
      context,
      simpletsRepository,
      deployMicroservice,
      storageMicroservice,
      nftsMicroservice,
      authenticationMicroservice,
      mailing,
      new EncryptionService(new AWS_KMS(), env.DEPLOY_KMS_KEY_ID),
      logger,
    );
    controller = new SimpletsController(
      context,
      new Scs(context),
      simpletsService,
      spendService,
      logger,
    );
  });

  it('should throw an error for an invalid event type', async () => {
    const event: any = {
      eventName: 'INVALID_EVENT',
      body: {},
    };
    await expect(processEvent(event, context, controller)).rejects.toThrow(
      'Invalid Simplet Event Type',
    );
  });

  describe('Simplets Tests', () => {
    it('should list simplets', async () => {
      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name 1',
          description: 'This is a dummy description 1.',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          backendRepo: 'https://github.com/dummy-backend-repo-1',
          backendPath: '/path/to/backend/1',
          backendMachine: {
            cpuCount: 1,
            memory: 4096,
            diskSize: 40,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-1',
          frontendPath: '/path/to/frontend/1',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();

      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID_2,
          name: 'Dummy Name 2',
          description: 'This is a dummy description 2.',
          contract_uuid: 'dummyContractUuid2',
          backendRepo: 'https://github.com/dummy-backend-repo-2',
          backendPath: '/path/to/backend/2',
          backendMachine: {
            cpuCount: 2,
            memory: 8192,
            diskSize: 80,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-2',
          frontendPath: '/path/to/frontend/2',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_LIST,
        body: {
          page: 1,
          limit: 10,
        },
      };

      const result = await processEvent(event, context, controller);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.items.length).toBe(2);
      expect(result.items[0].simplet_uuid).toBe(TEST_SIMPLET_UUID);
      expect(result.items[1].simplet_uuid).toBe(TEST_SIMPLET_UUID_2);
    });

    it('should get simplets', async () => {
      const event: any = {
        eventName: SimpletsEventType.GET_SIMPLET,
        body: { uuid: 'mockUuid' },
      };
      jest.spyOn(controller, 'getSimplet').mockResolvedValue(
        new Simplet({}, context)
          .populate({
            id: 1,
            simplet_uuid: TEST_SIMPLET_UUID,
            name: 'Dummy Name 1',
            description: 'This is a dummy description 1.',
            contract_uuid: TEST_NFT_COLLECTION_UUID,
            backendRepo: 'https://github.com/dummy-backend-repo-1',
            backendPath: '/path/to/backend/1',
            backendMachine: {
              cpuCount: 1,
              memory: 4096,
              diskSize: 40,
            },
            frontendRepo: 'https://github.com/dummy-frontend-repo-1',
            frontendPath: '/path/to/frontend/1',
            frontendInstallCommand: 'npm install',
            frontendBuildCommand: 'npm run build',
            frontendBuildDirectory: '/build/dist',
          })
          .serialize(),
      );

      const result = await processEvent(event, context, controller);

      expect(result).toStrictEqual({
        backendMachine: {
          cpuCount: 1,
          diskSize: 40,
          memory: 4096,
        },
        backendPath: '/path/to/backend/1',
        backendRepo: 'https://github.com/dummy-backend-repo-1',
        contract_uuid: TEST_NFT_COLLECTION_UUID,
        createTime: expect.any(Date),
        createUser: null,
        description: 'This is a dummy description 1.',
        frontendBuildCommand: 'npm run build',
        frontendBuildDirectory: '/build/dist',
        frontendInstallCommand: 'npm install',
        frontendPath: '/path/to/frontend/1',
        frontendRepo: 'https://github.com/dummy-frontend-repo-1',
        id: 1,
        name: 'Dummy Name 1',
        simplet_uuid: TEST_SIMPLET_UUID,
        status: 5,
        updateTime: null,
        updateUser: null,
      });
    });
  });

  describe('Simplet Deploy Tests', () => {
    it('should deploy simplet', async () => {
      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name 1',
          description: 'This is a dummy description 1.',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          backendRepo: 'https://github.com/dummy-backend-repo-1',
          backendPath: '/path/to/backend/1',
          backendMachine: {
            cpuCount: 1,
            memory: 4096,
            diskSize: 40,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-1',
          frontendPath: '/path/to/frontend/1',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {
          name: 'backend name',
          project_uuid: TEST_PROJECT_UUID,
          simplet_uuid: TEST_SIMPLET_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
          backendVariables: [
            {
              key: 'dummyBackendKey',
              value: 'dummyBackendValue',
              description: 'Dummy backend variable for testing',
            },
          ],
          frontendVariables: [
            {
              key: 'dummyFrontendKey',
              value: 'dummyFrontendValue',
              description: 'Dummy frontend variable for testing',
            },
          ],
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
      };
      jest.spyOn(deployMicroservice, 'deployDockerCompose').mockResolvedValue({
        success: true,
        data: {
          project_uuid: TEST_PROJECT_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          backendStatus: ResourceStatus.REQUESTED,
          name: 'Dummy Backend Name',
          description: 'Dummy Backend Description',
          instanceId: 'dummyInstanceId',
          url: 'http://dummy-backend-url.com',
        },
      });
      jest
        .spyOn(deployMicroservice, 'triggerWebDeploy')
        .mockResolvedValue({ success: true });
      jest.spyOn(storageMicroservice, 'createWebsite').mockResolvedValue({
        success: true,
        data: {
          website_uuid: TEST_WEBSITE_UUID,
          project_uuid: TEST_PROJECT_UUID,
          bucket_id: 123,
          stagingBucket_id: 456,
          productionBucket_id: 789,
          name: 'Dummy Website Name',
          description: 'Dummy description for the website',
          domain: 'dummy-domain.com',
          domainChangeDate: new Date(),
          domainLastCheckDate: new Date(),
          domainStatus: WebsiteDomainStatus.PENDING,
          cdnId: 'dummyCdnId',
          bucket_uuid: 'dummyBucketUuid',
          w3StagingLink: 'https://dummy-staging-link.com',
          w3ProductionLink: 'https://dummy-production-link.com',
          cidStaging: 'dummyCidStaging',
          cidProduction: 'dummyCidProduction',
          ipnsProduction: 'dummyIpnsProduction',
          lastDeployment_uuid: 'dummyLastDeploymentUuid',
          lastDeploymentStatus: 1,
          nftCollectionUuid: 'dummyNftCollectionUuid',
          source: WebsiteSource.APILLON,
        },
      });
      jest.spyOn(nftsMicroservice, 'getNftCollection').mockResolvedValue({
        success: true,
        data: {
          project_uuid: TEST_PROJECT_UUID,
          collection_uuid: TEST_NFT_COLLECTION_UUID,
          collectionStatus: CollectionStatus.DEPLOYED,
          collectionType: NFTCollectionType.GENERIC,
          name: 'Dummy Collection Name',
          description: 'Dummy Collection Description',
          owner: 'dummyOwner',
          symbol: 'dummySymbol',
          totalSupply: 100,
          maxSupply: 100,
          isAutoIncrement: true,
        },
      });
      jest
        .spyOn(authenticationMicroservice, 'createEmbeddedWalletIntegration')
        .mockResolvedValue({
          success: true,
          data: {
            wallet_uuid: 'wallet_uuid',
            integration_uuid: 'integration_uuid',
          },
        });

      axiosMock
        .onGet('https://github.com/dummy-backend-repo-1/path/to/backend/1')
        .reply(200, TEST_DOCKER_COMPOSE_CONTENT);

      const result = await processEvent(event, context, controller);

      expect(result.project_uuid).toBe(TEST_PROJECT_UUID);
      expect(result.simplet_uuid).toBe(TEST_SIMPLET_UUID);
      expect(result.simpletDeploy_uuid).toBeTruthy();
      expect(result.backend_uuid).toBe(TEST_BACKEND_UUID);
      expect(result.backendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(result.backendUrl).toBe('http://dummy-backend-url.com');
      expect(result.frontend_uuid).toBe(TEST_WEBSITE_UUID);
      expect(result.frontendStatus).toBe(ResourceStatus.DEPLOYING);
      expect(result.contract_uuid).toBe(TEST_NFT_COLLECTION_UUID);
      expect(result.contractStatus).toBe(CollectionStatus.DEPLOYING);
    });

    it('should fail deploying simplet if bad body is sent', async () => {
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {},
      };

      // TODO: assert invalid body fields
      await expect(processEvent(event, context, controller)).rejects.toThrow(
        'Validation error',
      );
    });

    it('should fail deploying simplet if simplet uuid is not in DB', async () => {
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {
          name: 'backend name',
          project_uuid: TEST_PROJECT_UUID,
          simplet_uuid: TEST_SIMPLET_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
          backendVariables: [
            {
              key: 'dummyBackendKey',
              value: 'dummyBackendValue',
              description: 'Dummy backend variable for testing',
            },
          ],
          frontendVariables: [
            {
              key: 'dummyFrontendKey',
              value: 'dummyFrontendValue',
              description: 'Dummy frontend variable for testing',
            },
          ],
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
      };

      await expect(processEvent(event, context, controller)).rejects.toThrow(
        'SIMPLET_NOT_FOUND',
      );
    });

    it('should fail deploying simplet if NFT service doesnt return a collection', async () => {
      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name 1',
          description: 'This is a dummy description 1.',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          backendRepo: 'https://github.com/dummy-backend-repo-1',
          backendPath: '/path/to/backend/1',
          backendMachine: {
            cpuCount: 1,
            memory: 4096,
            diskSize: 40,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-1',
          frontendPath: '/path/to/frontend/1',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();
      jest.spyOn(nftsMicroservice, 'getNftCollection').mockResolvedValue({
        success: false,
        data: null,
      });
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {
          name: 'backend name',
          project_uuid: TEST_PROJECT_UUID,
          simplet_uuid: TEST_SIMPLET_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
          backendVariables: [
            {
              key: 'dummyBackendKey',
              value: 'dummyBackendValue',
              description: 'Dummy backend variable for testing',
            },
          ],
          frontendVariables: [
            {
              key: 'dummyFrontendKey',
              value: 'dummyFrontendValue',
              description: 'Dummy frontend variable for testing',
            },
          ],
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
      };

      await expect(processEvent(event, context, controller)).rejects.toThrow(
        'COLLECTION_FETCH_FAILED',
      );
    });

    it('should fail deploying simplet if NFT collection doesnt have status deployed', async () => {
      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name 1',
          description: 'This is a dummy description 1.',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          backendRepo: 'https://github.com/dummy-backend-repo-1',
          backendPath: '/path/to/backend/1',
          backendMachine: {
            cpuCount: 1,
            memory: 4096,
            diskSize: 40,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-1',
          frontendPath: '/path/to/frontend/1',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();
      jest.spyOn(nftsMicroservice, 'getNftCollection').mockResolvedValue({
        success: true,
        data: {
          project_uuid: TEST_PROJECT_UUID,
          collection_uuid: TEST_NFT_COLLECTION_UUID,
          collectionStatus: CollectionStatus.DEPLOYING,
          collectionType: NFTCollectionType.GENERIC,
          name: 'Dummy Collection Name',
          description: 'Dummy Collection Description',
          owner: 'dummyOwner',
          symbol: 'dummySymbol',
          totalSupply: 100,
          maxSupply: 100,
          isAutoIncrement: true,
        },
      });
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {
          name: 'backend name',
          project_uuid: TEST_PROJECT_UUID,
          simplet_uuid: TEST_SIMPLET_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
          backendVariables: [
            {
              key: 'dummyBackendKey',
              value: 'dummyBackendValue',
              description: 'Dummy backend variable for testing',
            },
          ],
          frontendVariables: [
            {
              key: 'dummyFrontendKey',
              value: 'dummyFrontendValue',
              description: 'Dummy frontend variable for testing',
            },
          ],
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
      };

      await expect(processEvent(event, context, controller)).rejects.toThrow(
        'COLLECTION_NOT_DEPLOYED',
      );
    });

    it('should fail deploying simplet if NFT collection doesnt support autoincrement', async () => {
      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name 1',
          description: 'This is a dummy description 1.',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          backendRepo: 'https://github.com/dummy-backend-repo-1',
          backendPath: '/path/to/backend/1',
          backendMachine: {
            cpuCount: 1,
            memory: 4096,
            diskSize: 40,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-1',
          frontendPath: '/path/to/frontend/1',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();
      jest.spyOn(nftsMicroservice, 'getNftCollection').mockResolvedValue({
        success: true,
        data: {
          project_uuid: TEST_PROJECT_UUID,
          collection_uuid: TEST_NFT_COLLECTION_UUID,
          collectionStatus: CollectionStatus.DEPLOYED,
          collectionType: NFTCollectionType.GENERIC,
          name: 'Dummy Collection Name',
          description: 'Dummy Collection Description',
          owner: 'dummyOwner',
          symbol: 'dummySymbol',
          totalSupply: 100,
          maxSupply: 100,
          isAutoIncrement: false,
        },
      });
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {
          name: 'backend name',
          project_uuid: TEST_PROJECT_UUID,
          simplet_uuid: TEST_SIMPLET_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
          backendVariables: [
            {
              key: 'dummyBackendKey',
              value: 'dummyBackendValue',
              description: 'Dummy backend variable for testing',
            },
          ],
          frontendVariables: [
            {
              key: 'dummyFrontendKey',
              value: 'dummyFrontendValue',
              description: 'Dummy frontend variable for testing',
            },
          ],
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
      };

      await expect(processEvent(event, context, controller)).rejects.toThrow(
        'INVALID_COLLECTION_CONFIGURATION',
      );
    });

    it('should fail deploying simplet if NFT collection is not of type generic', async () => {
      await new Simplet({}, context)
        .populate({
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name 1',
          description: 'This is a dummy description 1.',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          backendRepo: 'https://github.com/dummy-backend-repo-1',
          backendPath: '/path/to/backend/1',
          backendMachine: {
            cpuCount: 1,
            memory: 4096,
            diskSize: 40,
          },
          frontendRepo: 'https://github.com/dummy-frontend-repo-1',
          frontendPath: '/path/to/frontend/1',
          frontendInstallCommand: 'npm install',
          frontendBuildCommand: 'npm run build',
          frontendBuildDirectory: '/build/dist',
        })
        .insert();
      jest.spyOn(nftsMicroservice, 'getNftCollection').mockResolvedValue({
        success: true,
        data: {
          project_uuid: TEST_PROJECT_UUID,
          collection_uuid: TEST_NFT_COLLECTION_UUID,
          collectionStatus: CollectionStatus.DEPLOYED,
          collectionType: NFTCollectionType.NESTABLE,
          name: 'Dummy Collection Name',
          description: 'Dummy Collection Description',
          owner: 'dummyOwner',
          symbol: 'dummySymbol',
          totalSupply: 100,
          maxSupply: 100,
          isAutoIncrement: true,
        },
      });
      const event: any = {
        eventName: SimpletsEventType.SIMPLETS_DEPLOY,
        body: {
          name: 'backend name',
          project_uuid: TEST_PROJECT_UUID,
          simplet_uuid: TEST_SIMPLET_UUID,
          backend_uuid: TEST_BACKEND_UUID,
          nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
          backendVariables: [
            {
              key: 'dummyBackendKey',
              value: 'dummyBackendValue',
              description: 'Dummy backend variable for testing',
            },
          ],
          frontendVariables: [
            {
              key: 'dummyFrontendKey',
              value: 'dummyFrontendValue',
              description: 'Dummy frontend variable for testing',
            },
          ],
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        },
      };

      await expect(processEvent(event, context, controller)).rejects.toThrow(
        'INVALID_COLLECTION_CONFIGURATION',
      );
    });

    // TODO:
    // it('should fail deploying simplet if ...', async () => {
    //   await new Simplet({}, context)
    //     .populate({
    //       simplet_uuid: TEST_SIMPLET_UUID,
    //       name: 'Dummy Name 1',
    //       description: 'This is a dummy description 1.',
    //       contract_uuid: TEST_NFT_COLLECTION_UUID,
    //       backendRepo: 'https://github.com/dummy-backend-repo-1',
    //       backendPath: '/path/to/backend/1',
    //       backendMachine: {
    //         cpuCount: 1,
    //         memory: 4096,
    //         diskSize: 40,
    //       },
    //       frontendRepo: 'https://github.com/dummy-frontend-repo-1',
    //       frontendPath: '/path/to/frontend/1',
    //       frontendInstallCommand: 'npm install',
    //       frontendBuildCommand: 'npm run build',
    //       frontendBuildDirectory: '/build/dist',
    //     })
    //     .insert();
    //   jest.spyOn(nftsMicroservice, 'getNftCollection').mockResolvedValue({
    //     success: true,
    //     data: {
    //       project_uuid: TEST_PROJECT_UUID,
    //       collection_uuid: TEST_NFT_COLLECTION_UUID,
    //       collectionStatus: CollectionStatus.DEPLOYED,
    //       collectionType: NFTCollectionType.GENERIC,
    //       name: 'Dummy Collection Name',
    //       description: 'Dummy Collection Description',
    //       owner: 'dummyOwner',
    //       symbol: 'dummySymbol',
    //       totalSupply: 100,
    //       maxSupply: 100,
    //       isAutoIncrement: true,
    //     },
    //   });
    //   const event: any = {
    //     eventName: SimpletsEventType.SIMPLETS_DEPLOY,
    //     body: {
    //       name: 'backend name',
    //       project_uuid: TEST_PROJECT_UUID,
    //       simplet_uuid: TEST_SIMPLET_UUID,
    //       backend_uuid: TEST_BACKEND_UUID,
    //       nftCollection_uuid: TEST_NFT_COLLECTION_UUID,
    //       backendVariables: [
    //         {
    //           key: 'dummyBackendKey',
    //           value: 'dummyBackendValue',
    //           description: 'Dummy backend variable for testing',
    //         },
    //       ],
    //       frontendVariables: [
    //         {
    //           key: 'dummyFrontendKey',
    //           value: 'dummyFrontendValue',
    //           description: 'Dummy frontend variable for testing',
    //         },
    //       ],
    //       apillonApiKey: 'dummyApiKey',
    //       apillonApiSecret: 'dummyApiSecret',
    //     },
    //   };
    //
    //   await expect(processEvent(event, context, controller)).rejects.toThrow(
    //     'INVALID_COLLECTION_CONFIGURATION',
    //   );
    // });

    it('should list deployed simplets', async () => {
      const event: any = {
        eventName: SimpletsEventType.LIST_DEPLOYED_SIMPLETS,
        body: {
          /* Mock body content for listing */
        },
      };
      jest.spyOn(controller, 'listDeployedSimplets').mockResolvedValue({
        items: [{ id: 'dummyId', name: 'dummyName' }],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await processEvent(event, context, controller);

      expect(controller.listDeployedSimplets).toHaveBeenCalledWith(event.body);
      expect(result).toStrictEqual({
        items: [
          {
            id: 'dummyId',
            name: 'dummyName',
          },
        ],
        limit: 10,
        page: 1,
        total: 1,
      });
    });

    it('should get deployed simplet', async () => {
      const simpletDeploy = await new SimpletDeploy({}, context)
        .populate({
          project_uuid: TEST_PROJECT_UUID,
          simpletDeploy_uuid: 'dummySimpletDeployUuid',
          simplet_uuid: TEST_SIMPLET_UUID,
          name: 'Dummy Name',
          description: 'Dummy Description',
          backend_uuid: TEST_BACKEND_UUID,
          backendStatus: ResourceStatus.REQUESTED,
          backendUrl: 'http://dummy-backend-url.com',
          contract_uuid: TEST_NFT_COLLECTION_UUID,
          contractStatus: ResourceStatus.REQUESTED,
          contractChain: EvmChain.ETHEREUM,
          contractChainType: ChainType.EVM,
          contractAddress: '0xDummyContractAddress',
          frontend_uuid: TEST_WEBSITE_UUID,
          frontendStatus: ResourceStatus.REQUESTED,
          apillonApiKey: 'dummyApiKey',
          apillonApiSecret: 'dummyApiSecret',
        })
        .insert();

      const event: any = {
        eventName: SimpletsEventType.GET_DEPLOYED_SIMPLET,
        body: { uuid: simpletDeploy.simpletDeploy_uuid },
      };
      const result = await processEvent(event, context, controller);

      expect(result).toStrictEqual({
        backendStatus: 0,
        backendUrl: 'http://dummy-backend-url.com',
        backend_uuid: TEST_BACKEND_UUID,
        contractAddress: '0xDummyContractAddress',
        contractChain: 1,
        contractChainType: 2,
        contractStatus: 0,
        contract_uuid: TEST_NFT_COLLECTION_UUID,
        createTime: expect.any(Date),
        description: 'Dummy Description',
        frontendStatus: 0,
        frontend_uuid: TEST_WEBSITE_UUID,
        name: 'Dummy Name',
        project_uuid: TEST_PROJECT_UUID,
        simpletDeploy_uuid: 'dummySimpletDeployUuid',
        simplet_uuid: TEST_SIMPLET_UUID,
        updateTime: expect.any(Date),
      });
    });
  });
});
