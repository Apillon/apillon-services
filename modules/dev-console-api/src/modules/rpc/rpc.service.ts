import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import {
  BaseProjectQueryFilter,
  BlockchainMicroservice,
  CreateRpcEnvironmentDto,
  CreateRpcUrlDto,
  InfrastructureMicroservice,
  ListRpcUrlsForEnvironmentQueryFilter,
  UpdateRpcUrlDto,
} from '@apillon/lib';
@Injectable()
export class RpcService {
  async listRpcEnvironments(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new InfrastructureMicroservice(context).listRpcEnvironments(query)
    ).data;
  }
  async getEnvironmentUsage(context: DevConsoleApiContext, id: number) {
    return (
      await new InfrastructureMicroservice(context).getEnvironmentUsage(id)
    ).data;
  }
  async createRpcEnvironment(
    context: DevConsoleApiContext,
    body: CreateRpcEnvironmentDto,
  ) {
    return (
      await new InfrastructureMicroservice(context).createRpcEnvironment(body)
    ).data;
  }
  async updateRpcEnvironment(
    context: DevConsoleApiContext,
    id: number,
    data: UpdateRpcUrlDto,
  ) {
    return (
      await new InfrastructureMicroservice(context).updateRpcEnvironment(
        id,
        data,
      )
    ).data;
  }
  async revokeRpcEnvironment(context: DevConsoleApiContext, id: number) {
    return (
      await new InfrastructureMicroservice(context).revokeRpcEnvironment(id)
    ).data;
  }
  async createRpcUrl(context: DevConsoleApiContext, body: CreateRpcUrlDto) {
    return (await new InfrastructureMicroservice(context).createRpcUrl(body))
      .data;
  }
  async updateRpcUrl(
    context: DevConsoleApiContext,
    id: number,
    data: UpdateRpcUrlDto,
  ) {
    return (
      await new InfrastructureMicroservice(context).updateRpcUrl(id, data)
    ).data;
  }
  async deleteRpcUrl(context: DevConsoleApiContext, id: number) {
    return (await new InfrastructureMicroservice(context).deleteRpcUrl(id))
      .data;
  }
  async listRpcUrlsForEnvironment(
    context: DevConsoleApiContext,
    query: ListRpcUrlsForEnvironmentQueryFilter,
  ) {
    return (
      await new InfrastructureMicroservice(context).listRpcUrlsForEnvironment(
        query,
      )
    ).data;
  }
}
