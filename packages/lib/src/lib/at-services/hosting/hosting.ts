import { env } from '../../../config/env';
import { AppEnvironment, DeployEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { DeployMSEventType } from './eventTypes';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';
import { GenericDeployRequestDto } from './dtos/generic-deploy-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';

export class HostingMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.DEPLOY_FUNCTION_NAME_TEST
      : env.DEPLOY_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.DEPLOY_SOCKET_PORT_TEST
      : env.DEPLOY_SOCKET_PORT;
  serviceName = 'HOSTING';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  async emitEvent(event: DeployMSEventType) {
    return await this.callService(event);
  }

  public async deployDockerCompose(body: DeployInstanceDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_DEPLOY_DOCKER_COMPOSE,
      body,
    });
  }

  public async listBackends(body: BackendsQueryFilter) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_LIST_BACKENDS,
      body,
    });
  }

  public async getInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE,
      body,
    });
  }

  public async getInstanceDetails(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE_DETAILS,
      body,
    });
  }

  public async startInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_START_INSTANCE,
      body,
    });
  }

  public async shutdownInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_SHUTDOWN_INSTANCE,
      body,
    });
  }

  public async stopInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_STOP_INSTANCE,
      body,
    });
  }

  public async restartInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_RESTART_INSTANCE,
      body,
    });
  }

  public async destroyInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_DESTROY_INSTANCE,
      body,
    });
  }

  public async resizeInstance(body: ResizeInstanceDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_RESIZE_INSTANCE,
      body,
    });
  }

  public async getInstanceState(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE_STATE,
      body,
    });
  }

  public async getInstanceAttestation(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE_ATTESTATION,
      body,
    });
  }

  // public async getInstanceBilling(body: GenericHostingRequestDto) {
  //   return await this.emitEvent({
  //     eventName: HostingEventType.BE_GET_INSTANCE_BILLING,
  //     body,
  //   });
  // }
}
