import { ServiceContext } from '@apillon/service-lib';
import {
  ContractsMicroservice,
  CreateContractDTO,
  CreateWebsiteDto,
  DeployedSimpletsQueryFilterDto,
  DeployInstanceDto,
  DeployMicroservice,
  EvmChain,
  Lmas,
  LogType,
  Mailing,
  ModelValidationException,
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

export class SimpletsService {
  private readonly context: ServiceContext;
  private simpletRepository: SimpletsRepository;
  private spendService: SimpletsSpendService;
  private mailingClient: Mailing;
  private logging: Lmas;
  private deployService: DeployMicroservice;
  private storageService: StorageMicroservice;

  constructor(
    context: ServiceContext,
    simpletRepository: SimpletsRepository,
    deployService: DeployMicroservice,
    storageService: StorageMicroservice,
    spendService: SimpletsSpendService,
    mailingClient: Mailing,
    logging: Lmas,
  ) {
    this.simpletRepository = simpletRepository;
    this.spendService = spendService;
    this.deployService = deployService;
    this.storageService = storageService;
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
      simpletDeployed_uuid: uuidV4(),
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

  async deployContract(
    simplet: Simplet,
    project_uuid: string,
    name: string,
    description: string,
    chain: EvmChain,
    constructorArguments: any[],
  ) {
    const payload = new CreateContractDTO({}, this.context).populate({
      project_uuid,
      name,
      description,
      contract_uuid: simplet.contract_uuid,
      chain,
      constructorArguments,
    });
    await payload.validateOrThrow(ModelValidationException, ValidatorErrorCode);

    return await new ContractsMicroservice(this.context).deployContract(
      payload,
    );
  }

  async deployBackend(simplet: Simplet, secrets: any[]) {
    const dockerComposeLocation = `${simplet.backendRepo.replace(/\/+$/, '')}/${simplet.backendPath.replace(/^\/+/, '')}`;
    const response = await fetch(dockerComposeLocation);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch content from URL: ${dockerComposeLocation}, status: ${response.status}`,
      );
    }
    const dockerCompose = await response.text();
    const deployDto = new DeployInstanceDto({}, this.context).populate({
      name: simplet.name,
      description: simplet.description,
      dockerCompose,
      secrets,
      virtualMachine: simplet.backendMachine,
    });
    await deployDto.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    return await this.deployService.deployDockerCompose(deployDto);
  }

  async deployFrontend(
    simplet: Simplet,
    project_uuid: string,
    simpletName: string,
    backendUrl: string,
    apillonApiKey: string,
    apillonApiSecret: string,
    secrets: any[],
  ) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Starting frontend deployment for simplet uuid ${simplet.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.deploySimplet',
    });
    const websiteResponse = await this.storageService.createWebsite(
      new CreateWebsiteDto({}, this.context).populate({
        project_uuid,
        name: `${simpletName} (Website)`,
        source: WebsiteSource.GITHUB,
      }),
    );
    if (!websiteResponse.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Website creation failed for simplet uuid ${simplet.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
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
        variables: [...secrets, { key: 'APP_URL', value: backendUrl }],
        apiKey: apillonApiKey,
        apiSecret: apillonApiSecret,
      }),
    );
    if (!storageResponse.success) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Frontend deployment failed for simplet uuid ${simplet.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
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
      location: 'SimpletsController.deploySimplet',
    });
    return { website_uuid };
  }

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletRepository.listDeployedSimplets(query);
  }
}
