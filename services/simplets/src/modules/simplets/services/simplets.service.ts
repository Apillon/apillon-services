import { ServiceContext } from '@apillon/service-lib';
import {
  AuthenticationMicroservice,
  CreateEWIntegrationDto,
  CreateWebsiteDto,
  DeployedSimpletsQueryFilterDto,
  DeployInstanceDto,
  DeployMicroservice,
  DeploySecretDto,
  EncryptionService,
  env,
  Lmas,
  LogType,
  Mailing,
  ModelValidationException,
  NFTCollectionType,
  NftsMicroservice,
  ResourceStatus,
  ServiceName,
  SimpletsQueryFilterDto,
  StorageMicroservice,
  ValidatorErrorCode,
  WebsiteDeployDto,
  WebsiteSource,
} from '@apillon/lib';
import crypto from 'crypto';
import { SimpletsRepository } from '../repositores/simplets-repository';
import { SimpletsSpendService } from './simplets-spend.service';
import { Simplet } from '../models/simplet.model';
import { SimpletsCodeException } from '../../../lib/exceptions';
import { SimpletsErrorCode } from '../../../config/types';
import path from 'node:path';
import { SimpletDeploy } from '../models/simpletDeploy.model';
import axios from 'axios';
import { IEmbeddedWallet } from '../types';

export class SimpletsService {
  private readonly context: ServiceContext;
  private simpletRepository: SimpletsRepository;
  private spendService: SimpletsSpendService;
  private mailingClient: Mailing;
  private logging: Lmas;
  private deployService: DeployMicroservice;
  private storageService: StorageMicroservice;
  private nftsService: NftsMicroservice;
  private authenticationService: AuthenticationMicroservice;
  private encryptionService: EncryptionService;

  constructor(
    context: ServiceContext,
    simpletRepository: SimpletsRepository,
    deployService: DeployMicroservice,
    storageService: StorageMicroservice,
    nftsService: NftsMicroservice,
    authenticationService: AuthenticationMicroservice,
    spendService: SimpletsSpendService,
    mailingClient: Mailing,
    encryptionService: EncryptionService,
    logging: Lmas,
  ) {
    this.simpletRepository = simpletRepository;
    this.spendService = spendService;
    this.deployService = deployService;
    this.storageService = storageService;
    this.nftsService = nftsService;
    this.authenticationService = authenticationService;
    this.mailingClient = mailingClient;
    this.encryptionService = encryptionService;
    this.logging = logging;
    this.context = context;
  }

  async listSimplets(query: SimpletsQueryFilterDto) {
    return await this.simpletRepository.listSimplets(query);
  }

  async createSimpletDeploy(
    project_uuid: string,
    simplet_uuid: string,
    simpletName: string,
    simpletDescription: string,
    apiKey: string,
    apiSecret: string,
    frontendVariables: DeploySecretDto[],
    backendVariables: DeploySecretDto[],
  ): Promise<{ simplet: Simplet; simpletDeploy: SimpletDeploy }> {
    const simplet = await this.simpletRepository.getSimplet(simplet_uuid);
    const simpletDeploy = await this.simpletRepository.createSimpletDeploy(
      project_uuid,
      simplet_uuid,
      simpletName,
      simpletDescription,
      apiKey,
      await this.encryptionService.encrypt(apiSecret),
      await this.encryptionService.encryptJson(frontendVariables),
      await this.encryptionService.encryptJson(backendVariables),
    );
    return { simplet, simpletDeploy };
  }

  async getSimplet(simplet_uuid: string) {
    return await this.simpletRepository.getSimplet(simplet_uuid);
  }

  async getDeployedSimplet(uuid: string): Promise<SimpletDeploy> {
    const simpletDeploy = await this.simpletRepository.getDeployedSimplet(uuid);
    simpletDeploy.canAccess(this.context);
    return simpletDeploy;
  }

  // async deployContract(
  //   simpletDeploy: SimpletDeploy,
  //   simplet: Simplet,
  //   project_uuid: string,
  //   name: string,
  //   description: string,
  //   chain: EvmChain,
  //   constructorArguments: any[],
  // ) {
  //   await this.logging.writeLog({
  //     logType: LogType.INFO,
  //     message: `Starting contract deployment for simplet uuid ${simplet.simplet_uuid}.`,
  //     service: ServiceName.SIMPLETS,
  //     location: 'SimpletsService.deployContract',
  //   });
  //   simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
  //   const payload = new CreateContractDTO({}, this.context).populate({
  //     project_uuid,
  //     name,
  //     description,
  //     contract_uuid: simplet.contract_uuid,
  //     chain,
  //     constructorArguments,
  //   });
  //   await payload.validateOrThrow(ModelValidationException, ValidatorErrorCode);
  //
  //   const contractDeploy = await new ContractsMicroservice(
  //     this.context,
  //   ).deployContract(payload);
  //   if (!contractDeploy.success) {
  //     await this.logging.writeLog({
  //       sendAdminAlert: true,
  //       logType: LogType.ERROR,
  //       message: `Contract deployment failed for simplet uuid ${simplet.simplet_uuid}.`,
  //       service: ServiceName.SIMPLETS,
  //       location: 'SimpletsService.deploySimplet',
  //     });
  //     throw new SimpletsCodeException({
  //       status: 500,
  //       code: SimpletsErrorCode.CONTRACT_DEPLOYMENT_FAILED,
  //       errorMessage: 'Contract deployment failed',
  //     });
  //   }
  //   await this.logging.writeLog({
  //     logType: LogType.INFO,
  //     message: `Contract successfully deployed for simplet uuid ${simplet.simplet_uuid}.`,
  //     service: ServiceName.SIMPLETS,
  //     location: 'SimpletsService.deploySimplet',
  //     data: contractDeploy.data,
  //   });
  //   simpletDeploy.contract_uuid = contractDeploy.data.contract_uuid;
  //   simpletDeploy.contractStatus = ResourceStatus.ONLINE;
  //   simpletDeploy.contractChainType = contractDeploy.data.chainType;
  //   simpletDeploy.contractChain = contractDeploy.data.chain;
  //   simpletDeploy.contractAddress = contractDeploy.data.contractAddress;
  // }

  async verifyNftCollection(
    simpletDeploy: SimpletDeploy,
    nftCollection_uuid: string,
  ) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Verifying collection with uuid ${nftCollection_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });
    simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
    // USE EXISTING COLLECTION
    const collection = await this.getCollection(nftCollection_uuid);
    // if collection is not deployed
    if (collection.collectionStatus !== 3) {
      throw new SimpletsCodeException({
        status: 422,
        code: SimpletsErrorCode.COLLECTION_NOT_DEPLOYED,
        errorMessage: `NFT collection with uuid ${collection.collection_uuid} is not deployed.`,
      });
    }
    if (!collection.isAutoIncrement) {
      throw new SimpletsCodeException({
        status: 422,
        code: SimpletsErrorCode.INVALID_COLLECTION_CONFIGURATION,
        errorMessage: `NFT collection with uuid ${collection.collection_uuid} has invalid configuration. Auto-increment is required.`,
      });
    }
    if (collection.collectionType !== NFTCollectionType.GENERIC) {
      throw new SimpletsCodeException({
        status: 422,
        code: SimpletsErrorCode.INVALID_COLLECTION_CONFIGURATION,
        errorMessage: `NFT collection with uuid ${collection.collection_uuid} has invalid configuration. Collection type should be generic.`,
      });
    }

    simpletDeploy.populate({
      contractStatus: ResourceStatus.ONLINE,
      contractAddress: collection.address,
      contractChain: collection.chain,
      contractChainType: collection.chainType,
      contract_uuid: collection.collection_uuid,
    });
  }

  private async getCollection(collection_uuid: string): Promise<any | null> {
    const result = await this.nftsService.getNftCollection(collection_uuid);
    if (!result.success) {
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.COLLECTION_FETCH_FAILED,
        errorMessage: `Failed to fetch NFT collection with uuid ${collection_uuid}.`,
      });
    }
    if (!result.data) {
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.NFT_COLLECTION_NOT_FOUND,
        errorMessage: 'NFT collection does not found.',
      });
    }
    return result.data;
  }

  async createWallet(
    project_uuid: string,
    simpletName: string,
  ): Promise<IEmbeddedWallet> {
    try {
      const response =
        await this.authenticationService.createEmbeddedWalletIntegration(
          new CreateEWIntegrationDto({}, this.context).populate({
            project_uuid,
            title: `${simpletName} (Simplet Wallet)`,
            description: `Auto generated wallet for ${simpletName} simplet.`,
            whitelistedDomains: '',
          }),
        );
      if (!response?.success) {
        throw new SimpletsCodeException({
          status: 500,
          code: SimpletsErrorCode.WALLET_CREATION_FAILED,
          errorMessage: 'Failed to create embedded wallet',
        });
      }
      return response.data;
    } catch (e) {
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.WALLET_CREATION_FAILED,
        errorMessage: `Failed to create embedded wallet: ${e?.message ?? String(e)}`,
      });
    }
  }

  async getEmbeddedWallet(
    walletIntegration_uuid: string,
  ): Promise<IEmbeddedWallet> {
    try {
      const response =
        await this.authenticationService.getEmbeddedWalletIntegration(
          walletIntegration_uuid,
        );
      if (!response?.success) {
        throw new SimpletsCodeException({
          status: 500,
          code: SimpletsErrorCode.WALLET_RETRIEVAL_FAILED,
          errorMessage: 'Failed to get embedded wallet',
        });
      }
      return response.data;
    } catch (e) {
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.WALLET_RETRIEVAL_FAILED,
        errorMessage: `Failed to get embedded wallet: ${e?.message ?? String(e)}`,
      });
    }
  }

  async deployBackend(simpletDeploy: SimpletDeploy, simplet: Simplet) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Starting backend deployment for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });
    const dockerCompose = await this.getDockerCompose(simplet);
    const backendVariables = await this.encryptionService.decryptJson<
      DeploySecretDto[]
    >(simpletDeploy.backendVariables);
    const apillonApiSecret = await this.encryptionService.decrypt(
      simpletDeploy.apillonApiSecret,
    );
    const deployDto = new DeployInstanceDto({}, this.context).populate({
      name: simplet.name.slice(0, 20),
      description: simplet.description,
      dockerCompose,
      secrets: this.overrideBackendSecrets(
        backendVariables,
        simpletDeploy.apillonApiKey,
        apillonApiSecret,
        simpletDeploy.contract_uuid,
      ),
      virtualMachine: simplet.backendMachine,
      project_uuid: simpletDeploy.project_uuid,
    });
    await deployDto.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    const backendDeploy =
      await this.deployService.deployDockerCompose(deployDto);
    if (!backendDeploy.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Backend deployment failed for simplet uuid ${simplet.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsService.deploySimplet',
      });
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.BACKEND_DEPLOYMENT_FAILED,
        errorMessage: 'Backend deployment failed',
      });
    }
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Backend successfully deployed for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
      data: backendDeploy.data,
    });

    return backendDeploy;
  }

  private async getDockerCompose(simplet: Simplet) {
    const dockerComposeLocation = `${simplet.backendRepo.replace(/\/+$/, '')}/${simplet.backendPath.replace(/^\/+/, '')}`;
    const response = await axios.get(dockerComposeLocation);
    return response.data;
  }

  private async createWebsite(
    simplet_uuid: string,
    createWebsiteDto: CreateWebsiteDto,
  ) {
    const websiteResponse =
      await this.storageService.createWebsite(createWebsiteDto);
    if (!websiteResponse.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Website creation failed for simplet uuid ${simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsService.createWebsite',
      });
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.WEBSITE_CREATION_FAILED,
        errorMessage: 'Website creation failed',
      });
    }
    return websiteResponse.data.website_uuid;
  }

  private async triggerWebDeploy(
    simplet_uuid: string,
    websiteDeployDto: WebsiteDeployDto,
  ) {
    const storageResponse =
      await this.deployService.triggerWebDeploy(websiteDeployDto);
    if (!storageResponse.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Frontend deployment failed for simplet uuid ${simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsService.triggerWebDeploy',
      });
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.FRONTEND_DEPLOYMENT_FAILED,
        errorMessage: 'Frontend deployment failed',
      });
    }
    return storageResponse;
  }

  async deployFrontend(simpletDeploy: SimpletDeploy, simplet: Simplet) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Starting frontend deployment for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });
    const website_uuid = await this.createWebsite(
      simpletDeploy.simplet_uuid,
      new CreateWebsiteDto({}, this.context).populate({
        project_uuid: simpletDeploy.project_uuid,
        name: `${simpletDeploy.name} (Website)`,
        source: WebsiteSource.GITHUB,
      }),
    );
    const frontendVariables = await this.encryptionService.decryptJson<
      DeploySecretDto[]
    >(simpletDeploy.frontendVariables);
    const apillonApiSecret = await this.encryptionService.decrypt(
      simpletDeploy.apillonApiSecret,
    );
    await this.triggerWebDeploy(
      simpletDeploy.simplet_uuid,
      new WebsiteDeployDto({}, this.context).populate({
        url: simplet.frontendRepo,
        buildDirectory: path.join(
          simplet.frontendPath,
          simplet.frontendBuildDirectory,
        ),
        websiteUuid: website_uuid,
        installCommand: `cd ${simplet.frontendPath} && ${simplet.frontendInstallCommand}`,
        buildCommand: `cd ${simplet.frontendPath} && ${simplet.frontendBuildCommand}`,
        variables: this.overrideFrontendVariables(
          frontendVariables,
          simpletDeploy,
        ),
        apiKey: simpletDeploy.apillonApiKey,
        apiSecret: apillonApiSecret,
        new: true,
      }),
    );

    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Frontend successfully deployed for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });

    return website_uuid;
  }

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletRepository.listDeployedSimplets(query);
  }

  private overrideFrontendVariables(
    frontendVariables: DeploySecretDto[],
    simpletDeploy: SimpletDeploy,
  ) {
    return overrideEnvironmentVariables(frontendVariables, [
      // TODO: these variables variable will be different for each simplet/framework
      { key: 'NUXT_PUBLIC_API_BASE', value: simpletDeploy.backendUrl },
      {
        key: 'NUXT_PUBLIC_EMBEDDED_WALLET_CLIENT',
        value: simpletDeploy.walletIntegration_uuid,
      },
      {
        key: 'NUXT_PUBLIC_CONTRACT_ADDRESS',
        value: simpletDeploy.contractAddress,
      },
      {
        key: 'NUXT_PUBLIC_CHAIN_ID',
        value: `${simpletDeploy.contractChain}`,
      },
    ]);
  }

  private overrideBackendSecrets(
    backendVariables: DeploySecretDto[],
    apillonApiKey: string,
    apillonApiSecret: string,
    collection_uuid: string,
  ) {
    return overrideEnvironmentVariables(backendVariables, [
      { key: 'APILLON_API_URL', value: env.APILLON_API_URL },
      { key: 'APILLON_KEY', value: apillonApiKey },
      { key: 'APILLON_SECRET', value: apillonApiSecret },
      { key: 'APP_SECRET', value: crypto.randomBytes(32).toString('hex') },
      { key: 'COLLECTION_UUID', value: collection_uuid },
    ]);
  }
}

interface EnvUpdate {
  key: string;
  value: string;
}

function overrideEnvironmentVariables(
  envVariables: any[],
  updates: EnvUpdate[],
) {
  for (const update of updates) {
    if (update.value) {
      const existingVariable = envVariables?.find((v) => v.key === update.key);
      if (existingVariable) {
        existingVariable.value = update.value;
      } else {
        envVariables.push({
          key: update.key,
          value: update.value,
        });
      }
    }
  }
  return envVariables;
}
