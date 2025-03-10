import {
  BackendsQueryFilter,
  DeployInstanceDto,
  GenericHostingRequestDto,
  ResizeInstanceDto,
  SqlModelStatus,
} from '@apillon/lib';
import { BackendStrategyHandler } from './backendStrategy.handler';
import { HostingRepository } from './repositores/hosting-repository';

export class BackendController {
  private readonly hostingRepository: HostingRepository;
  private readonly backendStrategyHandler: BackendStrategyHandler;

  constructor(
    hostingRepository: HostingRepository,
    backendStrategyHandler: BackendStrategyHandler,
  ) {
    this.hostingRepository = hostingRepository;
    this.backendStrategyHandler = backendStrategyHandler;
  }

  async deployDockerCompose(body: DeployInstanceDto): Promise<any> {
    return await this.backendStrategyHandler.deployDockerCompose(body);
  }

  async listBackends(body: BackendsQueryFilter): Promise<any> {
    return await this.hostingRepository.listBackends(body);
  }

  async getInstance(body: GenericHostingRequestDto): Promise<any> {
    return await this.hostingRepository.getBackend(body.hosting_uuid);
  }

  async getInstanceDetails(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.getInstanceDetails(backend);
  }

  async getInstanceStats(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.getInstanceStats(backend);
  }

  async getInstanceAttestation(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.getInstanceAttestation(backend);
  }

  // async getInstanceBilling(body: GenericHostingRequestDto): Promise<any> {
  //   const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
  //   return await this.backendStrategyHandler.getInstanceBilling(backend);
  // }

  async startInstance(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.startInstance(backend);
  }

  async shutdownInstance(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.shutdownInstance(backend);
  }

  async stopInstance(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.stopInstance(backend);
  }

  async restartInstance(body: GenericHostingRequestDto): Promise<any> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.restartInstance(backend);
  }

  async destroyInstance(body: GenericHostingRequestDto): Promise<boolean> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    await this.backendStrategyHandler.destroyInstance(backend);
    backend.status = SqlModelStatus.DELETED;
    await backend.update();
    return true;
  }

  async resizeInstance(body: ResizeInstanceDto): Promise<boolean> {
    const backend = await this.hostingRepository.getBackend(body.hosting_uuid);
    return await this.backendStrategyHandler.resizeInstance(backend, body);
  }
}
