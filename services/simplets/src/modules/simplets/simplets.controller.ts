import {
  DeployedSimpletsQueryFilterDto,
  Lmas,
  LogType,
  ServiceName,
  SimpletDeployDto,
  SimpletsQueryFilterDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletsCodeException } from '../../lib/exceptions';
import { SimpletsService } from './services/simplets.service';
import { ResourceStatus, SimpletsErrorCode } from '../../config/types';

export class SimpletsController {
  private readonly context: ServiceContext;
  private readonly simpletsService: SimpletsService;
  private logging: Lmas;

  constructor(
    context: ServiceContext,
    simpletService: SimpletsService,
    logging: Lmas,
  ) {
    this.context = context;
    this.simpletsService = simpletService;
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
    const { simplet, simpletDeploy } = await this.simpletsService.newSimplet(
      body.project_uuid,
      body.simplet_uuid,
      body.name,
      body.description,
    );
    try {
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Starting contract and backend deployment for simplet uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });
      // CONTRACT AND BACKEND DEPLOY
      simpletDeploy.backendStatus = ResourceStatus.DEPLOYING;
      simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
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
        simpletDeploy.contractStatus = ResourceStatus.DEPLOYED;
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
      simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;
      const { website_uuid } = await this.simpletsService.deployFrontend(
        simplet,
        body.project_uuid,
        body.name,
        backendDeploy.data.url,
        body.apillonApiKey,
        body.apillonApiSecret,
        body.frontendVariables,
      );
      simpletDeploy.frontend_uuid = website_uuid;
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Successfully completed deployment of simplet with uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });
    } catch (e: unknown) {
      if (e instanceof SimpletsCodeException) {
        throw e;
      }
      const message = `An unexpected error occurred while deploying simplet with uuid ${body.simplet_uuid}.`;
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
        data: e,
      });
      throw new SimpletsCodeException({
        status: 500,
        code: SimpletsErrorCode.GENERAL_SERVER_ERROR,
        errorMessage: message,
      });
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
