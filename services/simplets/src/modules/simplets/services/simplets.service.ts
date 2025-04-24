import { ServiceContext } from '@apillon/service-lib';
import {
  AuthenticationMicroservice,
  CreateEWIntegrationDto,
  CreateWebsiteDto,
  DeployedSimpletsQueryFilterDto,
  DeployInstanceDto,
  DeployMicroservice,
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
import { SimpletsRepository } from '../repositores/simplets-repository';
import { SimpletsSpendService } from './simplets-spend.service';
import { Simplet } from '../models/simplet.model';
import { SimpletsCodeException } from '../../../lib/exceptions';
import { SimpletsErrorCode } from '../../../config/types';
import path from 'node:path';
import { SimpletDeploy } from '../models/simpletDeploy.model';
import { v4 as uuidV4 } from 'uuid';
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

  constructor(
    context: ServiceContext,
    simpletRepository: SimpletsRepository,
    deployService: DeployMicroservice,
    storageService: StorageMicroservice,
    nftsService: NftsMicroservice,
    authenticationService: AuthenticationMicroservice,
    spendService: SimpletsSpendService,
    mailingClient: Mailing,
    logging: Lmas,
  ) {
    this.simpletRepository = simpletRepository;
    this.spendService = spendService;
    this.deployService = deployService;
    this.storageService = storageService;
    this.nftsService = nftsService;
    this.authenticationService = authenticationService;
    this.mailingClient = mailingClient;
    this.logging = logging;
    this.context = context;
  }

  async listSimplets(query: SimpletsQueryFilterDto) {
    return await this.simpletRepository.listSimplets(query);
  }

  async newSimplet(
    project_uuid: string,
    simplet_uuid: string,
    simpletName: string,
    simpletDescription: string,
  ) {
    const simplet = await this.simpletRepository.getSimplet(simplet_uuid);
    const simpletDeploy = new SimpletDeploy({}, this.context).populate({
      project_uuid,
      simpletDeploy_uuid: uuidV4(),
      simplet_uuid: simplet.simplet_uuid,
      name: simpletName,
      description: simpletDescription,
    });
    return { simplet, simpletDeploy };
  }

  async getSimplet(simplet_uuid: string) {
    return await this.simpletRepository.getSimplet(simplet_uuid);
  }

  async getDeployedSimplet(uuid: string) {
    return await this.simpletRepository.getDeployedSimplet(uuid);
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

  async createWallet(simpletDeploy: SimpletDeploy): Promise<IEmbeddedWallet> {
    try {
      const response =
        await this.authenticationService.createEmbeddedWalletIntegration(
          new CreateEWIntegrationDto({}, this.context).populate({
            project_uuid: simpletDeploy.project_uuid,
            title: `${simpletDeploy.name} (Simplet Wallet)`,
            description: `Auto generated wallet for ${simpletDeploy.name} simplet.`,
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

  async deployBackend(
    simpletDeploy: SimpletDeploy,
    simplet: Simplet,
    secrets: any[],
  ) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Starting backend deployment for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });
    simpletDeploy.backendStatus = ResourceStatus.DEPLOYING;
    const dockerComposeLocation = `${simplet.backendRepo.replace(/\/+$/, '')}/${simplet.backendPath.replace(/^\/+/, '')}`;
    const response = await axios.get(dockerComposeLocation);
    const dockerCompose = response.data;

    const deployDto = new DeployInstanceDto({}, this.context).populate({
      name: simplet.name.slice(0, 20),
      description: simplet.description,
      dockerCompose,
      secrets,
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
    const { backend_uuid, url: backendUrl } = backendDeploy.data;
    simpletDeploy.backend_uuid = backend_uuid;
    simpletDeploy.backendStatus = ResourceStatus.DEPLOYING;
    simpletDeploy.backendUrl = backendUrl;

    return backendDeploy;
  }

  async deployFrontend(
    simpletDeploy: SimpletDeploy,
    simplet: Simplet,
    embeddedWallet: IEmbeddedWallet,
    apillonApiKey: string,
    apillonApiSecret: string,
    secrets: any[],
  ) {
    simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Starting frontend deployment for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });
    const websiteResponse = await this.storageService.createWebsite(
      new CreateWebsiteDto({}, this.context).populate({
        project_uuid: simpletDeploy.project_uuid,
        name: `${simpletDeploy.name} (Website)`,
        source: WebsiteSource.GITHUB,
      }),
    );
    if (!websiteResponse.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Website creation failed for simplet uuid ${simplet.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsService.deploySimplet',
      });
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.WEBSITE_CREATION_FAILED,
        errorMessage: 'Website creation failed',
      });
    }
    const { website_uuid } = websiteResponse.data;
    const storageResponse = await this.deployService.triggerWebDeploy(
      new WebsiteDeployDto({}, this.context).populate({
        url: simplet.frontendRepo,
        buildDirectory: path.join(
          simplet.frontendPath,
          simplet.frontendBuildDirectory,
        ),
        websiteUuid: website_uuid,
        installCommand: `cd ${simplet.frontendPath} && ${simplet.frontendInstallCommand}`,
        buildCommand: `cd ${simplet.frontendPath} && ${simplet.frontendBuildCommand}`,
        variables: secrets,
        apiKey: apillonApiKey,
        apiSecret: apillonApiSecret,
        new: true,
      }),
    );
    if (!storageResponse.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Frontend deployment failed for simplet uuid ${simplet.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsService.deploySimplet',
      });
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.FRONTEND_DEPLOYMENT_FAILED,
        errorMessage: 'Frontend deployment failed',
      });
    }

    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Frontend successfully deployed for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsService.deploySimplet',
    });

    simpletDeploy.frontend_uuid = website_uuid;
  }

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletRepository.listDeployedSimplets(query);
  }
}
