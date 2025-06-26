import {
  BackendsQueryFilter,
  DeployInstanceDto,
  EncryptionService,
  GenericDeployRequestDto,
  RedeployInstanceDto,
  ResizeInstanceDto,
  SqlModelStatus,
} from '@apillon/lib';
import { BackendStrategyHandler } from './backendStrategy.handler';
import { DeployRepository } from './repositores/deploy-repository';
import { ServiceContext } from '@apillon/service-lib';

export class BackendController {
  constructor(
    private readonly context: ServiceContext,
    private readonly deployRepository: DeployRepository,
    private readonly backendStrategyHandler: BackendStrategyHandler,
    private readonly encryptionService: EncryptionService,
  ) {}

  async deployDockerCompose(
    body: DeployInstanceDto,
  ): Promise<{ [key: string]: any }> {
    const backend = await this.backendStrategyHandler.deployDockerCompose(body);
    return backend.serializeByContext(this.context);
  }

  async redeployDockerCompose(
    body: RedeployInstanceDto,
  ): Promise<{ [key: string]: any }> {
    const backend =
      await this.backendStrategyHandler.redeployDockerCompose(body);
    return backend.serializeByContext(this.context);
  }

  async listBackends(body: BackendsQueryFilter): Promise<any> {
    return await this.deployRepository.listBackends(body);
  }

  async getBackend(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    backend.environmentVariables = backend.environmentVariables
      ? await this.encryptionService.decryptJson(backend.environmentVariables)
      : null;
    return backend;
  }

  async getInstanceDetails(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.getInstanceDetails(backend);
  }

  async getInstanceStats(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.getInstanceStats(backend);
  }

  async getInstanceAttestation(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.getInstanceAttestation(backend);
  }

  // async getInstanceBilling(body: GenericDeployRequestDto): Promise<any> {
  //   const backend = await this.deployRepository.getBackend(body.deploy_uuid);
  //   return await this.backendStrategyHandler.getInstanceBilling(backend);
  // }

  async startInstance(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.startInstance(backend);
  }

  async shutdownInstance(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.shutdownInstance(backend);
  }

  async stopInstance(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.stopInstance(backend);
  }

  async restartInstance(body: GenericDeployRequestDto): Promise<any> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.restartInstance(backend);
  }

  async destroyInstance(body: GenericDeployRequestDto): Promise<boolean> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    await this.backendStrategyHandler.destroyInstance(backend);
    backend.status = SqlModelStatus.DELETED;
    await backend.update();
    return true;
  }

  async resizeInstance(body: ResizeInstanceDto): Promise<boolean> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    return await this.backendStrategyHandler.resizeInstance(backend, body);
  }

  async archiveInstance(body: GenericDeployRequestDto): Promise<void> {
    const backend = await this.deployRepository.getBackend(body.deploy_uuid);
    await this.backendStrategyHandler.shutdownInstance(backend);
    await backend.markArchived();
  }
}
