import {
  BackendsQueryFilter,
  GenericDeployRequestDto,
  HostingMicroservice,
  ResizeInstanceDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class BackendsService {
  // async deployDockerCompose(
  //   context: DevConsoleApiContext,
  //   body: DeployInstanceDto,
  // ) {
  //   return (await new HostingMicroservice(context).deployDockerCompose(body))
  //     .data;
  // }

  async listBackends(context: DevConsoleApiContext, body: BackendsQueryFilter) {
    return (await new HostingMicroservice(context).listBackends(body)).data;
  }

  async getInstance(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).getInstance(body)).data;
  }

  async getInstanceDetails(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).getInstanceDetails(body))
      .data;
  }

  async startInstance(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).startInstance(body)).data;
  }

  async shutdownInstance(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).shutdownInstance(body)).data;
  }

  async stopInstance(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).stopInstance(body)).data;
  }

  async restartInstance(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).restartInstance(body)).data;
  }

  async destroyInstance(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).destroyInstance(body)).data;
  }

  async resizeInstance(context: DevConsoleApiContext, body: ResizeInstanceDto) {
    return (await new HostingMicroservice(context).resizeInstance(body)).data;
  }

  async getInstanceState(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).getInstanceState(body)).data;
  }

  async getInstanceAttestation(
    context: DevConsoleApiContext,
    body: GenericDeployRequestDto,
  ) {
    return (await new HostingMicroservice(context).getInstanceAttestation(body))
      .data;
  }

  // async getInstanceBilling(
  //   context: DevConsoleApiContext,
  //   body: GenericHostingRequestDto,
  // ) {
  //   return (await new HostingMicroservice(context).getInstanceBilling(body))
  //     .data;
  // }
}
