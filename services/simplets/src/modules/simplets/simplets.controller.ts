import {
  CreateWebsiteDto,
  DeployedSimpletsQueryFilterDto,
  DeployWebsiteDto,
  Lmas,
  SimpletDeployDto,
  SimpletsQueryFilterDto,
  StorageMicroservice,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletsCodeException } from '../../lib/exceptions';
import { SimpletsService } from './services/simplets.service';
import { ResourceStatus, SimpletsErrorCode } from '../../config/types';
import { Simplet } from './models/simplet.model';
import { SimpletDeploy } from './models/simpletDeploy.model';
import { v4 as uuidV4 } from 'uuid';

export class SimpletsController {
  private readonly context: ServiceContext;
  private readonly simpletsService: SimpletsService;
  private logging: Lmas;

  constructor(
    context: ServiceContext,
    contractService: SimpletsService,
    logging: Lmas,
  ) {
    this.context = context;
    this.simpletsService = contractService;
    this.logging = logging;
  }

  //#region SIMPLETS

  async listSimplets(query: SimpletsQueryFilterDto) {
    return await this.simpletsService.listSimplets(
      new SimpletsQueryFilterDto(query),
    );
  }

  async deploySimplet(body: SimpletDeployDto) {
    console.log(
      `Deploying simplet with uuid ${body.simplet_uuid}:`,
      ` ${JSON.stringify(body)}`,
    );
    const simplet = await new Simplet({}, this.context).populateByUUID(
      body.simplet_uuid,
    );
    if (!simplet || !simplet.exists()) {
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.SIMPLET_NOT_FOUND,
        context: this.context,
        sourceFunction: 'deploySimplet',
      });
    }

    const simpletDeploy = new SimpletDeploy({}, this.context).populate({
      project_uuid: body.project_uuid,
      simpletDeployed_uuid: uuidV4(),
      simplet_uuid: simplet.simplet_uuid,
      name: body.name,
      description: body.description,
    });
    try {
      // CONTRACT DEPLOY
      const contractDeploy = await this.simpletsService.deployContract(
        simplet,
        body.project_uuid,
        body.name,
        body.description,
        body.chain,
        body.contractConstructorArguments,
      );
      if (contractDeploy.status !== 200 || !contractDeploy.success) {
        throw new SimpletsCodeException({
          status: contractDeploy.status,
          code: SimpletsErrorCode.CONTRACT_DEPLOYMENT_FAILED,
          context: this.context,
          sourceFunction: 'deploySimplet',
          errorMessage: `Contract deployment failed with status code ${contractDeploy.status}`,
        });
      }
      const { contract_uuid, contractAddress, chain, chainType } =
        contractDeploy.data;
      simpletDeploy.contract_uuid = contract_uuid;
      simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
      simpletDeploy.contractChainType = chainType;
      simpletDeploy.contractChain = chain;
      simpletDeploy.contractAddress = contractAddress;

      // BACKEND DEPLOY
      const backendDeploy = await this.simpletsService.deployBackend(
        simplet,
        body.backendVariables,
      );
      if (backendDeploy.status !== 200 || !backendDeploy.success) {
        throw new SimpletsCodeException({
          status: backendDeploy.status,
          code: SimpletsErrorCode.BACKEND_DEPLOYMENT_FAILED,
          context: this.context,
          sourceFunction: 'deploySimplet',
          errorMessage: `Backend deployment failed with status code ${backendDeploy.status}`,
        });
      }
      const { backend_uuid, backendUrl } = backendDeploy.data;
      simpletDeploy.backend_uuid = backend_uuid;
      simpletDeploy.backendStatus = ResourceStatus.DEPLOYED;
      simpletDeploy.backendUrl = backendUrl;

      // FRONTEND DEPLOY
      const websiteResponse = await new StorageMicroservice(
        this.context,
      ).createWebsite(
        new CreateWebsiteDto({}, this.context).populate({
          project_uuid: body.project_uuid,
          name: `${body.name} - Website`,
        }),
      );
      const { website_uuid } = websiteResponse.data;
      simpletDeploy.frontend_uuid = website_uuid;
      simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;
      await new StorageMicroservice(this.context).triggerWebDeploy(
        new DeployWebsiteDto({}, this.context).populate({
          url: simplet.frontendRepo,
          buildDirectory: './dist',
          websiteUuid: website_uuid,
          installCommand: `cd ${simplet.frontendPath} && ${simplet.frontendInstallCommand}`,
          buildCommand: simplet.frontendBuildCommand,
          variables: body.frontendVariables,
        }),
      );
    } catch (e: unknown) {
      throw e;
    } finally {
      await simpletDeploy.insert();
    }
    return simpletDeploy.serializeByContext(this.context);
  }

  async getSimplet(uuid: string) {
    const simplet = await this.simpletsService.getSimplet(uuid);

    return simplet.serializeByContext(this.context);
  }

  //#region ------------- DEPLOYED SIMPLETS -------------

  //#endregion
  async getDeployedSimplet(uuid: string) {
    const simplet = await this.simpletsService.getDeployedSimplet(uuid);

    return simplet.serializeByContext(this.context);
  }

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletsService.listDeployedSimplets(
      new DeployedSimpletsQueryFilterDto(query),
    );
  }

  //#endregion
}
