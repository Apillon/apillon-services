import { env } from '../../../config/env';
import { AppEnvironment, HostingEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { HostingMSEventType } from './eventTypes';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';
import { GenericHostingRequestDto } from './dtos/generic-hosting-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';

export class HostingMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.HOSTING_FUNCTION_NAME_TEST
      : env.HOSTING_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.HOSTING_SOCKET_PORT_TEST
      : env.HOSTING_SOCKET_PORT;
  serviceName = 'HOSTING';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  async emitEvent(event: HostingMSEventType) {
    return await this.callService(event);
  }

  public async deployDockerCompose(body: DeployInstanceDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_DEPLOY_DOCKER_COMPOSE,
      body,
    });
  }

  public async listBackends(body: BackendsQueryFilter) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_LIST_BACKENDS,
      body,
    });
  }

  public async getInstance(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_GET_INSTANCE,
      body,
    });
  }

  public async getInstanceDetails(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_GET_INSTANCE_DETAILS,
      body,
    });
  }

  public async startInstance(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_START_INSTANCE,
      body,
    });
  }

  public async shutdownInstance(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_SHUTDOWN_INSTANCE,
      body,
    });
  }

  public async stopInstance(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_STOP_INSTANCE,
      body,
    });
  }

  public async restartInstance(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_RESTART_INSTANCE,
      body,
    });
  }

  public async destroyInstance(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_DESTROY_INSTANCE,
      body,
    });
  }

  public async resizeInstance(body: ResizeInstanceDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_RESIZE_INSTANCE,
      body,
    });
  }

  public async getInstanceState(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_GET_INSTANCE_STATE,
      body,
    });
  }

  public async getInstanceAttestation(body: GenericHostingRequestDto) {
    return await this.emitEvent({
      eventName: HostingEventType.BE_GET_INSTANCE_ATTESTATION,
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
