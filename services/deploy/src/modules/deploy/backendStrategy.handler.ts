import {
  DeployInstanceDto,
  EncryptionService,
  Lmas,
  RedeployInstanceDto,
  ResizeInstanceDto,
  ResourceStatus,
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
      const envVariables = body.secrets.map((secret) => {
        // Convert all secrets to strings else Phala deploy fails
        secret.value = secret.value == null ? '' : String(secret.value);
        return secret;
      });
      const secrets = await this.encryptionService.encryptJson(envVariables);
      const result = await this.strategy.updateDockerCompose(
        backend,
        envVariables,
      );
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
        secrets: secrets,
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
