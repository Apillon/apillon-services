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
  SubscriptionPackageId,
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
  ) {
    // BACKEND DEPLOY
    if (simplet.backendRepo && !simpletDeploy.backend_uuid) {
      try {
        simpletDeploy.backendStatus = ResourceStatus.DEPLOYING;
        const { backendDeploy } = await this.simpletsService.deployBackend(
          simpletDeploy,
          simplet,
        );
        const { backend_uuid, url: backendUrl } = backendDeploy.data;
        simpletDeploy.populate({
          backend_uuid,
          backendUrl,
        });
      } catch (e) {
        simpletDeploy.backendStatus = ResourceStatus.FAILED;
        // mark FE status as error since it wont get deployed
        simpletDeploy.frontendStatus = ResourceStatus.CANCELED;
        throw e;
      }
    }

    // FRONTEND DEPLOY
    if (simplet.frontendRepo && !simpletDeploy.frontend_uuid) {
      try {
        simpletDeploy.frontendStatus = ResourceStatus.DEPLOYING;
        simpletDeploy.frontend_uuid = await this.simpletsService.deployFrontend(
          simpletDeploy,
          simplet,
        );
      } catch (e) {
        simpletDeploy.frontendStatus = ResourceStatus.FAILED;
        throw e;
      }
    }
  }

  private async getOrCreateWallet(
    project_uuid: string,
    name: string,
    walletIntegration_uuid?: string,
  ): Promise<IEmbeddedWallet> {
    if (walletIntegration_uuid) {
      return await this.getWallet(project_uuid, walletIntegration_uuid);
    } else {
      return await this.simpletsService.createWallet(project_uuid, name);
    }
  }

  private async getWallet(
    project_uuid: string,
    walletIntegration_uuid: string,
  ) {
    const embeddedWallet = await this.simpletsService.getEmbeddedWallet(
      walletIntegration_uuid,
    );
    if (embeddedWallet.project_uuid !== project_uuid) {
      throw new SimpletsCodeException({
        status: 403,
        code: SimpletsErrorCode.WALLET_ACCESS_DENIED,
        errorMessage: 'Access to wallet denied - project mismatch',
      });
    }
    return embeddedWallet;
  }

  async deploySimplet(body: SimpletDeployDto): Promise<DeployResult> {
    // VALIDATION
    const isSimpletQuotaReached = await this.getSimpletQuotaReached(
      body.project_uuid,
    );
    if (isSimpletQuotaReached) {
      throw new SimpletsCodeException({
        status: 403,
        code: SimpletsErrorCode.MAX_SIMPLETS_COUNT_REACHED,
        context: this.context,
      });
    }
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

    // EMBEDDED WALLET
    const embeddedWallet = await this.getOrCreateWallet(
      simpletDeploy.project_uuid,
      simpletDeploy.name,
      simpletDeploy.walletIntegration_uuid || body.walletIntegration_uuid,
    );
    simpletDeploy.walletIntegration_uuid = embeddedWallet.integration_uuid;

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
        () => this.deploySimpletComponents(simplet, simpletDeploy),
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

  private async getSimpletQuotaReached(project_uuid: string) {
    const maxBackends = (
      await this.configService.getQuota({
        quota_id: QuotaCode.MAX_SIMPLET_COUNT,
        project_uuid,
      })
    ).value;
    const simpletsCount =
      await this.simpletsService.getDeployedSimpletsCount(project_uuid);
    return simpletsCount >= maxBackends;
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
    if (
      simpletDeploy.trialExpired &&
      !(await this.hasActiveSubscription(simpletDeploy.project_uuid))
    ) {
      throw new SimpletsCodeException({
        status: 402,
        code: SimpletsErrorCode.TRIAL_EXPIRED,
        context: this.context,
      });
    }
    const simplet = await this.simpletsService.getSimplet(
      simpletDeploy.simplet_uuid,
    );
    // get wallet to verify it exists, else error is thrown
    await this.getWallet(
      simpletDeploy.project_uuid,
      simpletDeploy.walletIntegration_uuid,
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

  async archiveSimpletDeploy(simpletDeploy_uuid: string) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Archiving simplet deploy with uuid ${simpletDeploy_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.archiveSimpletDeploy',
    });

    try {
      await this.simpletsService.archiveSimpletDeploy(simpletDeploy_uuid);

      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Successfully archived simplet deploy with uuid ${simpletDeploy_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.archiveSimpletDeploy',
      });

      return { success: true };
    } catch (e: unknown) {
      const message =
        e instanceof SimpletsCodeException
          ? e.message
          : `An unexpected error occurred while archiving simplet deploy with uuid ${simpletDeploy_uuid}: ${e instanceof Error ? e.message : String(e)}.`;

      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.archiveSimpletDeploy',
        data: e,
      });

      return { success: false, error: message };
    }
  }

  async activateSimpletDeploy(simpletDeploy_uuid: string) {
    await this.logging.writeLog({
      logType: LogType.INFO,
      message: `Activating simplet deploy with uuid ${simpletDeploy_uuid}.`,
      service: ServiceName.SIMPLETS,
      location: 'SimpletsController.activateSimpletDeploy',
    });

    try {
      await this.simpletsService.activateSimpletDeploy(simpletDeploy_uuid);

      await this.logging.writeLog({
        logType: LogType.INFO,
        message: `Successfully activated simplet deploy with uuid ${simpletDeploy_uuid}.`,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.activateSimpletDeploy',
      });

      return { success: true };
    } catch (e: unknown) {
      const message =
        e instanceof SimpletsCodeException
          ? e.message
          : `An unexpected error occurred while restoring simplet deploy with uuid ${simpletDeploy_uuid}: ${e instanceof Error ? e.message : String(e)}.`;

      await this.logging.writeLog({
        sendAdminAlert: true,
        logType: LogType.ERROR,
        message,
        service: ServiceName.SIMPLETS,
        location: 'SimpletsController.activateSimpletDeploy',
        data: e,
      });

      return { success: false, error: message };
    }
  }

  //#region ------------- DEPLOYED SIMPLETS -------------

  async isSimpletQuotaReached(project_uuid: string) {
    return { quotaReached: await this.getSimpletQuotaReached(project_uuid) };
  }

  async getDeployedSimplet(uuid: string) {
    const deployedSimplet = await this.simpletsService.getDeployedSimplet(uuid);

    return deployedSimplet.serializeByContext(this.context);
  }

  async getDeployedSimpletByBackendUuid(backend_uuid: string) {
    const deployedSimplet =
      await this.simpletsService.getDeployedSimpletByBackendUuid(backend_uuid);

    return deployedSimplet.serializeByContext(this.context);
  }

  async listDeployedSimplets(query: DeployedSimpletsQueryFilterDto) {
    return await this.simpletsService.listDeployedSimplets(
      new DeployedSimpletsQueryFilterDto(query),
    );
  }

  //#endregion

  //#region ------------- HELPERS -------------
  private async hasActiveSubscription(project_uuid: string): Promise<boolean> {
    const { data } =
      await this.configService.getProjectActiveSubscription(project_uuid);

    return (
      !!data.package_id &&
      [
        SubscriptionPackageId.BUTTERFLY,
        SubscriptionPackageId.COCOON,
        SubscriptionPackageId.CATERPILLAR,
      ].includes(data.package_id)
    );
  }

  //#endregion
}
