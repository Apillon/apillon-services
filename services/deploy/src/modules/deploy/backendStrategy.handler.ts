import {
  DeployInstanceDto,
  EncryptionService,
  Lmas,
  overrideEnvironmentVariables,
  QuotaCode,
  RedeployInstanceDto,
  ResizeInstanceDto,
  ResourceStatus,
  Scs,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { IBackendDeployStrategy } from './types';
import { Backend } from './models/backend.model';

import { DeployCodeException } from '../../lib/exceptions';
import { DeployErrorCode } from '../../config/types';
import { DeployRepository } from './repositores/deploy-repository';

export class BackendStrategyHandler {
  private readonly context: ServiceContext;
  private readonly strategy: IBackendDeployStrategy;
  private logging: Lmas;
  private encryptionService: EncryptionService;
  private deployRepository: DeployRepository;

  constructor(
    context: ServiceContext,
    encryptionService: EncryptionService,
    deployRepository: DeployRepository,
    deployStrategy: IBackendDeployStrategy,
    logging: Lmas,
    private readonly configMS: Scs,
  ) {
    this.context = context;
    this.encryptionService = encryptionService;
    this.deployRepository = deployRepository;
    this.strategy = deployStrategy;
    this.logging = logging;
  }

  //#region on-chain
  async deployDockerCompose(body: DeployInstanceDto): Promise<Backend> {
    let backend: Backend;
    const maxBackends = (
      await this.configMS.getQuota({
        quota_id: QuotaCode.MAX_SIMPLET_BACKEND_COUNT,
        project_uuid: body.project_uuid,
      })
    ).value;

    const totalBackends = (
      await this.deployRepository.getByProjectUuid(body.project_uuid)
    ).length;

    if (totalBackends >= maxBackends) {
      const context = this.context;
      throw new DeployCodeException({
        status: 403,
        code: DeployErrorCode.MAX_SIMPLET_BACKEND_COUNT_REACHED,
        context,
      });
    }

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
      if (backend) {
        backend.populate({
          backendStatus: ResourceStatus.FAILED,
        });
        await backend.insert();
      }
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
    return await this.strategy.startInstance(backend);
  }

  async shutdownInstance(backend: Backend) {
    return await this.strategy.shutdownInstance(backend);
  }

  async stopInstance(backend: Backend) {
    return await this.strategy.stopInstance(backend);
  }

  async restartInstance(backend: Backend) {
    return await this.strategy.restartInstance(backend);
  }

  async destroyInstance(backend: Backend) {
    return await this.strategy.destroyInstance(backend);
  }

  async resizeInstance(backend: Backend, body: ResizeInstanceDto) {
    return await this.strategy.resizeInstance(backend, body);
  }

  //#endregion
}
