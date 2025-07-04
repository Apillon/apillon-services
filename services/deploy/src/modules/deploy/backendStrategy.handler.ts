import {
  DeployInstanceDto,
  EncryptionService,
  env,
  overrideEnvironmentVariables,
  RedeployInstanceDto,
  ResizeInstanceDto,
  ResourceDeployWebhookDataDto,
  ResourceStatus,
  Scs,
  SimpletsMicroservice,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { IBackendDeployStrategy } from './types';
import { Backend } from './models/backend.model';

import { DeployCodeException } from '../../lib/exceptions';
import { DbTables, DeployErrorCode } from '../../config/types';
import { DeployRepository } from './repositores/deploy-repository';
import { WorkerName } from '../../workers/worker-executor';
import { sendToWorkerQueue } from '@apillon/workers-lib';

export class BackendStrategyHandler {
  constructor(
    private readonly context: ServiceContext,
    private readonly encryptionService: EncryptionService,
    private readonly deployRepository: DeployRepository,
    private readonly strategy: IBackendDeployStrategy,
    private readonly simpletsService: SimpletsMicroservice,
    private readonly scsService: Scs,
  ) {}

  //#region on-chain
  async deployDockerCompose(body: DeployInstanceDto): Promise<Backend> {
    let backend: Backend;
    try {
      const secrets = await this.encryptionService.encryptJson(body.secrets);
      backend = await this.deployRepository.newBackend(
        body.project_uuid,
        body.name,
        body.description,
        body.dockerCompose,
        secrets,
      );

      const { backendStatus, instanceId, url, data } =
        await this.strategy.deployDockerCompose(body);
      backend.populate({
        backendStatus,
        instanceId,
        url,
        data,
      });
      await backend.insert();
      return backend;
    } catch (e: unknown) {
      if (e instanceof DeployCodeException) {
        throw e;
      }
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
        context: this.context,
        errorMessage: 'An unknown error occurred during deployment',
      });
    }
  }

  async redeployDockerCompose(body: RedeployInstanceDto): Promise<Backend> {
    const backend = await this.deployRepository.getBackend(body.backend_uuid);
    // authorize is caller is user (skip if caller is worker)
    if (this.context.user) {
      backend.canModify(this.context);
    }
    // Check if the simplet has expired and if the project has an active subscription
    const { data: simpletDeploy } =
      await this.simpletsService.getDeployedSimpletByBackendUuid(
        body.backend_uuid,
      );
    if (
      simpletDeploy &&
      simpletDeploy.trialExpired &&
      !(await this.scsService.projectHasPaidSubscription(backend.project_uuid))
    ) {
      throw new DeployCodeException({
        status: 402,
        code: DeployErrorCode.TRIAL_EXPIRED,
        context: this.context,
        errorMessage:
          'Trial has expired. Please upgrade to a paid subscription to continue using this service.',
      });
    }
    try {
      const secrets = overrideEnvironmentVariables(
        await this.encryptionService.decryptJson(backend.environmentVariables),
        body.secrets,
      ).map((envVariable) => {
        // Convert all secrets to strings else Phala deploy fails
        envVariable.value =
          envVariable.value == null ? '' : String(envVariable.value);
        return envVariable;
      });
      const environmentVariables =
        await this.encryptionService.encryptJson(secrets);

      const result = await this.strategy.updateDockerCompose(backend, secrets);
      if (result?.detail !== 'Accepted') {
        throw new DeployCodeException({
          status: 500,
          code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
          context: this.context,
          errorMessage: 'Deployment was not accepted by the server',
        });
      }
      backend.populate({
        backendStatus: ResourceStatus.DEPLOYING,
        environmentVariables,
      });
      await this.simpletsService.updateBackendStatus(
        backend.backend_uuid,
        ResourceStatus.DEPLOYING,
      );

      return backend;
    } catch (e: unknown) {
      backend.populate({
        backendStatus: ResourceStatus.FAILED,
      });
      if (e instanceof DeployCodeException) {
        throw e;
      }
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
        context: this.context,
        errorMessage: 'An unknown error occurred during deployment',
      });
    } finally {
      await backend.update();
    }
  }

  async getInstanceDetails(backend: Backend) {
    return await this.strategy.getInstanceDetails(backend);
  }

  async getInstanceStats(backend: Backend) {
    return await this.strategy.getInstanceStats(backend);
  }

  async getInstanceAttestation(backend: Backend) {
    return await this.strategy.getInstanceAttestation(backend);
  }

  //
  // async getInstanceBilling(backend: Backend) {
  //   return await this.strategy.getInstanceBilling(backend);
  // }

  async startInstance(backend: Backend) {
    const result = await this.strategy.startInstance(backend);
    await this.signalBackendStatus(backend, ResourceStatus.DEPLOYING);
    return result;
  }

  async shutdownInstance(backend: Backend) {
    const result = await this.strategy.shutdownInstance(backend);
    await this.signalBackendStatus(backend, ResourceStatus.SHUTTING_DOWN);
    return result;
  }

  async stopInstance(backend: Backend) {
    const result = await this.strategy.stopInstance(backend);
    await this.signalBackendStatus(backend, ResourceStatus.STOPPING);
    return result;
  }

  async restartInstance(backend: Backend) {
    const result = await this.strategy.restartInstance(backend);
    await this.signalBackendStatus(backend, ResourceStatus.RESTARTING);
    return result;
  }

  async destroyInstance(backend: Backend) {
    const result = await this.strategy.destroyInstance(backend);
    await this.signalBackendStatus(backend, ResourceStatus.SHUTTING_DOWN);
    return result;
  }

  async resizeInstance(backend: Backend, body: ResizeInstanceDto) {
    const result = await this.strategy.resizeInstance(backend, body);
    await this.signalBackendStatus(backend, ResourceStatus.RESTARTING);
    return result;
  }

  //#endregion

  private async signalBackendStatus(backend: Backend, status: ResourceStatus) {
    backend.backendStatus = status;
    await backend.update();
    await sendToWorkerQueue(
      env.SIMPLETS_AWS_WORKER_SQS_URL,
      WorkerName.BACKEND_STATUS_WORKER,
      [
        {
          data: new ResourceDeployWebhookDataDto().populate({
            referenceTable: DbTables.BACKEND,
            referenceId: backend.backend_uuid,
            resourceStatus: backend.backendStatus,
          }),
        },
      ],
      null,
      null,
    );
  }
}
