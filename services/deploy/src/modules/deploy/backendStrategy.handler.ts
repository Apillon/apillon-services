import { DeployInstanceDto, Lmas, ResizeInstanceDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { IBackendDeployStrategy } from './types';
import { Backend } from './models/backend.model';
import { v4 as uuidV4 } from 'uuid';

export class BackendStrategyHandler {
  private readonly context: ServiceContext;
  private readonly strategy: IBackendDeployStrategy;
  private logging: Lmas;

  constructor(
    context: ServiceContext,
    deployStrategy: IBackendDeployStrategy,
    logging: Lmas,
  ) {
    this.context = context;
    this.strategy = deployStrategy;
    this.logging = logging;
  }

  //#region on-chain
  async deployDockerCompose(
    body: DeployInstanceDto,
    //TODO: ): Promise<ICreateVMResponse> {
  ): Promise<any> {
    try {
      const result = await this.strategy.deployDockerCompose(body);
      // TODO: vcpu as DTO?
      // TODO: add dto ICreateVMResponse?
      const appId = result?.app_id;
      const externalStatus = result?.status;
      // TODO: add backendStatus column and cast externalStatus to a common status?
      const data = {
        appId: appId,
        id: result?.id,
        name: result?.name,
        status: externalStatus,
        teepodId: result?.teepod_id,
        teepod: {
          id: result?.teepod?.id,
          name: result?.teepod?.name,
        },
        userId: result?.user_id,
        vmUuid: result?.vm_uuid,
        instanceId: result?.instance_id,
        appUrl: result?.app_url,
        baseImage: result?.base_image,
        vcpu: result?.vcpu,
        memory: result?.memory,
        diskSize: result?.disk_size,
        manifestVersion: result?.manifest_version,
        version: result?.version,
        runner: result?.runner,
        dockerComposeFile: result?.docker_compose_file,
        features: result?.features,
        createdAt: result?.created_at,
        encryptedEnvPubkey: result?.encrypted_env_pubkey,
        dashboardUrl: `https://cloud.phala.network/dashboard/cvms/app_${appId}`,
      };
      const backend = new Backend({}, this.context).populate({
        backend_uuid: uuidV4(),
        name: `${body.name} (Backend)`,
        description: `${body.description} (Backend)`,
        instanceId: appId,
        url: `https://${appId}-80.dstack-prod4.phala.network`,
        data,
      });
      await backend.insert();
      return backend.serializeByContext(this.context);
    } catch (e: unknown) {
      throw e;
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
