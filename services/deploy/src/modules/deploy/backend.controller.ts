import {
  BackendsQueryFilter,
  DeployInstanceDto,
  GenericDeployRequestDto,
  ResizeInstanceDto,
  SqlModelStatus,
} from '@apillon/lib';
import { BackendStrategyHandler } from './backendStrategy.handler';
import { DeployRepository } from './repositores/deploy-repository';

export class BackendController {
  private readonly deployRepository: DeployRepository;
  private readonly backendStrategyHandler: BackendStrategyHandler;

  constructor(
    deployRepository: DeployRepository,
    backendStrategyHandler: BackendStrategyHandler,
  ) {
    this.deployRepository = deployRepository;
    this.backendStrategyHandler = backendStrategyHandler;
  }

  async deployDockerCompose(body: DeployInstanceDto): Promise<any> {
    return await this.backendStrategyHandler.deployDockerCompose(body);
  }

  async listBackends(body: BackendsQueryFilter): Promise<any> {
    return await this.deployRepository.listBackends(body);
  }

  async getInstance(body: GenericDeployRequestDto): Promise<any> {
    return await this.deployRepository.getBackend(body.deploy_uuid);
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
}
