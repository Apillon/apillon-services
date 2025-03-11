import { ServiceContext } from '@apillon/service-lib';
import {
  ContractsMicroservice,
  CreateContractDTO,
  DeployedSimpletsQueryFilterDto,
  DeployInstanceDto,
  DeployMicroservice,
  EvmChain,
  Lmas,
  Mailing,
  ModelValidationException,
  SimpletsQueryFilterDto,
  ValidatorErrorCode,
} from '@apillon/lib';
import { SimpletsRepository } from '../repositores/simplets-repository';
import { SimpletsSpendService } from './simplets-spend.service';
import { Simplet } from '../models/simplet.model';

export class SimpletsService {
  private readonly context: ServiceContext;
  private simpletRepository: SimpletsRepository;
  private spendService: SimpletsSpendService;
  private mailingClient: Mailing;
  private logging: Lmas;
  private deployService: DeployMicroservice;

  constructor(
    context: ServiceContext,
    simpletRepository: SimpletsRepository,
    deployService: DeployMicroservice,
    spendService: SimpletsSpendService,
    mailingClient: Mailing,
    logging: Lmas,
  ) {
    this.simpletRepository = simpletRepository;
    this.spendService = spendService;
    this.deployService = deployService;
    this.mailingClient = mailingClient;
    this.logging = logging;
    this.context = context;
  }

  async listSimplets(query: SimpletsQueryFilterDto) {
    return await this.simpletRepository.listSimplets(query);
  }

  async getSimplet(uuid: string) {
    return await this.simpletRepository.getSimplet(uuid);
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

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletRepository.listDeployedSimplets(query);
  }
}
