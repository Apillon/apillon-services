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
      // CONTRACT DEPLOY
      if (body.nftCollection_uuid) {
        simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
        // USE EXISTING COLLECTION
        const collection = await this.simpletsService.getCollection(
          body.nftCollection_uuid,
        );
        if (!collection) {
          throw new SimpletsCodeException({
            status: 404,
            code: SimpletsErrorCode.NFT_COLLECTION_NOT_FOUND,
            errorMessage: 'NFT collection does not found.',
          });
        }
        // if collection is not deployed
        if (collection.collectionStatus !== 3) {
          throw new SimpletsCodeException({
            status: 422,
            code: SimpletsErrorCode.COLLECTION_NOT_DEPLOYED,
            errorMessage: `NFT collection with uuid ${collection.collection_uuid} is not deployed.`,
          });
        }
        simpletDeploy.contractStatus = ResourceStatus.DEPLOYED;
        simpletDeploy.contractAddress = collection.address;
        simpletDeploy.contractChain = collection.chain;
        simpletDeploy.contractChainType = collection.chainType;
        simpletDeploy.contract_uuid = collection.collection_uuid;
      }
      // else if (simplet.contract_uuid) {
      //    simpletDeploy.contractStatus = ResourceStatus.DEPLOYING;
      //   // DEPLOY NEW SMART CONTRACT
      //   if (!body.chain || !body.contractConstructorArguments) {
      //     throw new SimpletsCodeException({
      //       status: 422,
      //       code: SimpletsErrorCode.DATA_NOT_VALID,
      //       errorMessage: 'Chain or contract constructor arguments are missing',
      //     });
      //   }
      //   const contractDeploy = await this.simpletsService.deployContract(
      //     simplet,
      //     body.project_uuid,
      //     body.name,
      //     body.description,
      //     body.chain,
      //     body.contractConstructorArguments,
      //   );
      //   if (!contractDeploy.success) {
      //     await this.logging.writeLog({
      //       sendAdminAlert: true,
      //       logType: LogType.ERROR,
      //       message: `Contract deployment failed for simplet uuid ${body.simplet_uuid}.`,
      //       service: ServiceName.SIMPLETS,
      //       location: 'SimpletsController.deploySimplet',
      //     });
      //     throw new SimpletsCodeException({
      //       status: 500,
      //       code: SimpletsErrorCode.CONTRACT_DEPLOYMENT_FAILED,
      //       errorMessage: 'Contract deployment failed',
      //     });
      //   }
      //   await this.logging.writeLog({
      //     logType: LogType.INFO,
      //     message: `Contract successfully deployed for simplet uuid ${body.simplet_uuid}.`,
      //     service: ServiceName.SIMPLETS,
      //     location: 'SimpletsController.deploySimplet',
      //     data: contractDeploy.data,
      //   });
      //   const { contract_uuid, contractAddress, chain, chainType } =
      //     contractDeploy.data;
      //   simpletDeploy.contract_uuid = contract_uuid;
      //   simpletDeploy.contractStatus = ResourceStatus.DEPLOYED;
      //   simpletDeploy.contractChainType = chainType;
      //   simpletDeploy.contractChain = chain;
      //   simpletDeploy.contractAddress = contractAddress;
      // }

      // BACKEND DEPLOY
      if (simplet.backendRepo) {
        simpletDeploy.backendStatus = ResourceStatus.DEPLOYING;
        const backendDeploy = await this.simpletsService.deployBackend(
          simplet,
          body.backendVariables,
        );
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

      // FRONTEND DEPLOY
      simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;
      const { website_uuid } = await this.simpletsService.deployFrontend(
        simplet,
        body.project_uuid,
        body.name,
        simpletDeploy.backendUrl,
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
