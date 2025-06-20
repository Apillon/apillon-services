import {
  DeployedSimpletsQueryFilterDto,
  Lmas,
  LogType,
  ProductCode,
  QuotaCode,
  ResourceStatus,
  Scs,
  ServiceName,
  SimpletDeployDto,
  SimpletRedeployDto,
  SimpletsQueryFilterDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletsCodeException } from '../../lib/exceptions';
import { SimpletsService } from './services/simplets.service';
import { SimpletsErrorCode } from '../../config/types';
import { SimpletDeploy } from './models/simpletDeploy.model';
import { Simplet } from './models/simplet.model';
import { IEmbeddedWallet } from './types';
import { SimpletsSpendService } from './services/simplets-spend.service';

interface DeployResult {
  success: boolean;
  data: any;
  errors: string[];
}

export class SimpletsController {
  constructor(
    private readonly context: ServiceContext,
    private readonly configService: Scs,
    private readonly simpletsService: SimpletsService,
    private readonly spendService: SimpletsSpendService,
    private readonly logging: Lmas,
  ) {}

  //#region SIMPLETS

  async listSimplets(query: SimpletsQueryFilterDto) {
    return await this.simpletsService.listSimplets(
      new SimpletsQueryFilterDto(query),
    );
  }

  private async deploySimpletComponents(
    simplet: Simplet,
    simpletDeploy: SimpletDeploy,
    overrideWalletIntegration_uuid: string = null,
  ) {
    // EMBEDDED WALLET
    const walletIntegration_uuid =
      simpletDeploy.walletIntegration_uuid || overrideWalletIntegration_uuid;
    let embeddedWallet: IEmbeddedWallet;
    if (walletIntegration_uuid) {
      embeddedWallet = await this.simpletsService.getEmbeddedWallet(
        walletIntegration_uuid,
      );
      if (embeddedWallet.project_uuid !== simpletDeploy.project_uuid) {
        throw new SimpletsCodeException({
          status: 403,
          code: SimpletsErrorCode.WALLET_ACCESS_DENIED,
          errorMessage: 'Access to wallet denied - project mismatch',
        });
      }
    } else {
      embeddedWallet = await this.simpletsService.createWallet(
        simpletDeploy.project_uuid,
        simpletDeploy.name,
      );
    }
    simpletDeploy.walletIntegration_uuid = embeddedWallet.integration_uuid;

    // BACKEND DEPLOY
    if (simplet.backendRepo && !simpletDeploy.backend_uuid) {
      simpletDeploy.backendStatus = ResourceStatus.DEPLOYING;
      const { backendDeploy, dockerCompose } =
        await this.simpletsService.deployBackend(simpletDeploy, simplet);
      const { backend_uuid, url: backendUrl } = backendDeploy.data;
      Object.assign(simpletDeploy, {
        backend_uuid,
        backendStatus: ResourceStatus.DEPLOYING,
        backendUrl,
        backendDockerCompose: dockerCompose,
        backendVirtualMachine: simplet.backendMachine,
      });
    }

    // FRONTEND DEPLOY
    if (simplet.frontendRepo && !simpletDeploy.frontend_uuid) {
      simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;
      simpletDeploy.frontend_uuid = await this.simpletsService.deployFrontend(
        simpletDeploy,
        simplet,
      );
    }
  }

  async deploySimplet(body: SimpletDeployDto): Promise<DeployResult> {
    // VALIDATION
    await this.validateSimpletsQuota(body.project_uuid);
    const { simplet, simpletDeploy } =
      await this.simpletsService.newSimpletDeploy(
        body.project_uuid,
        body.simplet_uuid,
        body.name,
        body.description,
        body.apillonApiKey,
        body.apillonApiSecret,
        body.frontendVariables,
        body.backendVariables,
      );
    await this.simpletsService.verifyNftCollection(
      simpletDeploy,
      body.nftCollection_uuid,
    );

    // DEPLOY ALL
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Deploying simplet with uuid ${body.simplet_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.deploySimplet',
      data: body,
    });
    let success = false;
    const errors: string[] = [];
    try {
      await this.spendService.chargeDeploy(
        body.project_uuid,
        simpletDeploy.simpletDeploy_uuid,
        ProductCode.SIMPLET_NFT_STUDIO_DEPLOY,
        () =>
          this.deploySimpletComponents(
            simplet,
            simpletDeploy,
            body.walletIntegration_uuid,
          ),
      );
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Successfully completed deployment of simplet with uuid ${body.simplet_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
      });
      success = true;
    } catch (e: unknown) {
      const message =
        e instanceof SimpletsCodeException
          ? e.message
          : `An unexpected error occurred while deploying simplet with uuid ${body.simplet_uuid}: ${e instanceof Error ? e.message : String(e)}.`;
      errors.push(message);
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.deploySimplet',
        data: e,
      });
    } finally {
      await simpletDeploy.insert();
    }
    return {
      success,
      data: simpletDeploy.serializeByContext(this.context),
      errors,
    };
  }

  private async validateSimpletsQuota(project_uuid: string) {
    const maxBackends = (
      await this.configService.getQuota({
        quota_id: QuotaCode.MAX_SIMPLET_COUNT,
        project_uuid,
      })
    ).value;
    const simpletsCount =
      await this.simpletsService.getDeployedSimpletsCount(project_uuid);
    if (simpletsCount >= maxBackends) {
      throw new SimpletsCodeException({
        status: 403,
        code: SimpletsErrorCode.MAX_SIMPLETS_COUNT_REACHED,
        context: this.context,
      });
    }
  }

  async redeploySimplet(body: SimpletRedeployDto): Promise<DeployResult> {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Redeploying simplet deploy with uuid ${body.simpletDeploy_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.redeploySimplet',
      data: body,
    });

    const simpletDeploy = await this.simpletsService.getDeployedSimplet(
      body.simpletDeploy_uuid,
    );
    const simplet = await this.simpletsService.getSimplet(
      simpletDeploy.simplet_uuid,
    );

    let success = false;
    const errors: string[] = [];
    try {
      await this.deploySimpletComponents(simplet, simpletDeploy);
      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Successfully completed redeployment of simplet deploy with uuid ${simpletDeploy.simpletDeploy_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.redeploySimplet',
      });
      success = true;
    } catch (e: unknown) {
      const message =
        e instanceof SimpletsCodeException
          ? e.message
          : `An unexpected error occurred while redeploying simplet deploy with uuid ${simpletDeploy.simpletDeploy_uuid}: ${String(e)}.`;
      errors.push(message);
      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.redeploySimplet',
        data: e,
      });
    } finally {
      await simpletDeploy.update();
    }

    return {
      success,
      data: simpletDeploy.serializeByContext(this.context),
      errors,
    };
  }

  async getSimplet(uuid: string) {
    const simplet = await this.simpletsService.getSimplet(uuid);

    return simplet.serializeByContext(this.context);
  }

  //#region ------------- DEPLOYED SIMPLETS -------------

  //#endregion
  async getDeployedSimplet(uuid: string) {
    const deployedSimplet = await this.simpletsService.getDeployedSimplet(uuid);

    return deployedSimplet.serializeByContext(this.context);
  }

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletsService.listDeployedSimplets(
      new DeployedSimpletsQueryFilterDto(query),
    );
  }

  //#endregion
}
