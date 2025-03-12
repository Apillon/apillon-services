import {
  CreateWebsiteDto,
  DeployedSimpletsQueryFilterDto,
  Lmas,
  LogType,
  ServiceName,
  SimpletDeployDto,
  SimpletsQueryFilterDto,
  StorageMicroservice,
  WebsiteDeployDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletsCodeException } from '../../lib/exceptions';
import { SimpletsService } from './services/simplets.service';
import { ResourceStatus, SimpletsErrorCode } from '../../config/types';
import { Simplet } from './models/simplet.model';
import { SimpletDeploy } from './models/simpletDeploy.model';
import { v4 as uuidV4 } from 'uuid';
import * as path from 'node:path';

export class SimpletsController {
  private readonly context: ServiceContext;
  private readonly simpletsService: SimpletsService;
  private logging: Lmas;
  private storageService: StorageMicroservice;

  constructor(
    context: ServiceContext,
    simpletService: SimpletsService,
    storageService: StorageMicroservice,
    logging: Lmas,
  ) {
    this.context = context;
    this.simpletsService = simpletService;
    this.storageService = storageService;
    this.logging = logging;
  }

  //#region SIMPLETS

  async listSimplets(query: SimpletsQueryFilterDto) {
    return await this.simpletsService.listSimplets(
      new SimpletsQueryFilterDto(query),
    );
  }

  async deploySimplet(body: SimpletDeployDto) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Deploying simplet with uuid ${body.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.deploySimplet',
      data: body,
    });
    const simplet = await new Simplet({}, this.context).populateByUUID(
      body.simplet_uuid,
    );
    if (!simplet || !simplet.exists()) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Simplet with uuid ${body.simplet_uuid} not found.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.SIMPLET_NOT_FOUND,
        context: this.context,
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
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Starting contract and backend deployment for simplet uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });

      // CONTRACT AND BACKEND DEPLOY
      const [contractDeploy, backendDeploy] = await Promise.all([
        this.simpletsService.deployContract(
          simplet,
          body.project_uuid,
          body.name,
          body.description,
          body.chain,
          body.contractConstructorArguments,
        ),
        this.simpletsService.deployBackend(simplet, body.backendVariables),
      ]);

      // Update contract details
      if (contractDeploy.success) {
        await this.logging.writeLog({
          logType: LogType.INFO,
          message: `Contract successfully deployed for simplet uuid ${body.simplet_uuid}.`,
          service: ServiceName.SIMPLETS,
          location: 'SimpletsController.deploySimplet',
          data: contractDeploy.data,
        });
        const { contract_uuid, contractAddress, chain, chainType } =
          contractDeploy.data;
        simpletDeploy.contract_uuid = contract_uuid;
        simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
        simpletDeploy.contractChainType = chainType;
        simpletDeploy.contractChain = chain;
        simpletDeploy.contractAddress = contractAddress;
      }

      // Update backend details
      if (backendDeploy.success) {
        await this.logging.writeLog({
          logType: LogType.INFO,
          message: `Backend successfully deployed for simplet uuid ${body.simplet_uuid}.`,
          service: ServiceName.SIMPLETS,
          location: 'SimpletsController.deploySimplet',
          data: backendDeploy.data,
        });
        const { backend_uuid, url: backendUrl } = backendDeploy.data;
        simpletDeploy.backend_uuid = backend_uuid;
        simpletDeploy.backendStatus = ResourceStatus.DEPLOYED;
        simpletDeploy.backendUrl = backendUrl;
      }

      if (!contractDeploy.success) {
        await this.logging.writeLog({
          sendAdminAlert: true,
          logType: LogType.ERROR,
          message: `Contract deployment failed for simplet uuid ${body.simplet_uuid}.`,
          service: ServiceName.SIMPLETS,
          location: 'SimpletsController.deploySimplet',
        });
        throw new SimpletsCodeException({
          status: 500,
          code: SimpletsErrorCode.CONTRACT_DEPLOYMENT_FAILED,
          errorMessage: 'Contract deployment failed',
        });
      }

      if (!backendDeploy.success) {
        await this.logging.writeLog({
          sendAdminAlert: true,
          logType: LogType.ERROR,
          message: `Backend deployment failed for simplet uuid ${body.simplet_uuid}.`,
          service: ServiceName.SIMPLETS,
          location: 'SimpletsController.deploySimplet',
        });
        throw new SimpletsCodeException({
          status: 500,
          code: SimpletsErrorCode.BACKEND_DEPLOYMENT_FAILED,
          errorMessage: 'Backend deployment failed',
        });
      }

      // FRONTEND DEPLOY
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Starting frontend deployment for simplet uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });

      const websiteResponse = await this.storageService.createWebsite(
        new CreateWebsiteDto({}, this.context).populate({
          project_uuid: body.project_uuid,
          name: `${body.name} (Website)`,
        }),
      );
      if (!websiteResponse.success) {
        await this.logging.writeLog({
          sendAdminAlert: true,
          logType: LogType.ERROR,
          message: `Website creation failed for simplet uuid ${body.simplet_uuid}.`,
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
      simpletDeploy.frontend_uuid = website_uuid;
      simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;

      const storageResponse = await this.storageService.triggerWebDeploy(
        new WebsiteDeployDto({}, this.context).populate({
          url: simplet.frontendRepo,
          buildDirectory: path.join(
            simplet.frontendPath,
            simplet.frontendBuildDirectory,
          ),
          websiteUuid: website_uuid,
          installCommand: `cd ${simplet.frontendPath} && ${simplet.frontendInstallCommand}`,
          buildCommand: `cd ${simplet.frontendPath} && ${simplet.frontendBuildCommand}`,
          variables: [
            ...body.frontendVariables,
            { key: 'APP_URL', value: simpletDeploy.backendUrl },
          ],
          apiKey: body.apiKey,
          apiSecret: body.apiSecret,
        }),
      );
      if (!storageResponse.success) {
        await this.logging.writeLog({
          sendAdminAlert: true,
          logType: LogType.ERROR,
          message: `Frontend deployment failed for simplet uuid ${body.simplet_uuid}.`,
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
        message: `Frontend successfully deployed for simplet uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });

      simpletDeploy.frontendStatus = ResourceStatus.DEPLOYED;
    } catch (e: unknown) {
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message: `Error occurred while deploying simplet with uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
        data: e,
      });
      throw e instanceof SimpletsCodeException
        ? e
        : new SimpletsCodeException({
            status: 500,
            code: SimpletsErrorCode.GENERAL_SERVER_ERROR,

            errorMessage: 'An unexpected error occurred during deployment',
          });
    } finally {
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Inserting simplet deployment record for simplet uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });
      await simpletDeploy.insert();
    }

    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Successfully completed deployment of simplet with uuid ${body.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.deploySimplet',
    });
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
