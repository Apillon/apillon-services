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
import { SimpletsErrorCode } from '../../config/types';

function overrideEnvironmentVariables(
  envVariables: any[],
  key: string,
  value: string,
) {
  if (value) {
    const apiSecretVariable = envVariables?.find((v) => v.key === key);
    if (apiSecretVariable) {
      apiSecretVariable.value = value;
    } else {
      envVariables.push({
        key,
        value,
      });
    }
  }
  return envVariables;
}

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
      // NFT COLLECTION CHECK
      await this.simpletsService.verifyNftCollection(
        simpletDeploy,
        body.nftCollection_uuid,
      );
      // override ENV variables
      overrideEnvironmentVariables(
        body.backendVariables,
        'APILLON_KEY',
        body.apillonApiSecret,
      );
      overrideEnvironmentVariables(
        body.backendVariables,
        'APILLON_SECRET',
        body.apillonApiSecret,
      );
      overrideEnvironmentVariables(
        body.backendVariables,
        'COLLECTION_UUID',
        body.nftCollection_uuid,
      );

      // else if (simplet.contract_uuid) {
      // // DEPLOY NEW SMART CONTRACT
      // if (!body.chain || !body.contractConstructorArguments) {
      //   throw new SimpletsCodeException({
      //     status: 422,
      //     code: SimpletsErrorCode.DATA_NOT_VALID,
      //     errorMessage: 'Chain or contract constructor arguments are missing',
      //   });
      // }
      // const contractDeploy = await this.simpletsService.deployContract(
      //   simpletDeploy,
      //   simplet,
      //   body.project_uuid,
      //   body.name,
      //   body.description,
      //   body.chain,
      //   body.contractConstructorArguments,
      // );
      // }

      // BACKEND DEPLOY
      if (simplet.backendRepo) {
        await this.simpletsService.deployBackend(
          simpletDeploy,
          simplet,
          body.backendVariables,
        );
      }

      // FRONTEND DEPLOY
      await this.simpletsService.deployFrontend(
        simpletDeploy,
        simplet,
        body.project_uuid,
        body.name,
        body.apillonApiKey,
        body.apillonApiSecret,
        body.frontendVariables,
      );

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
      const message = `An unexpected error occurred while deploying simplet with uuid ${body.simplet_uuid}: ${String(e)}.`;
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
