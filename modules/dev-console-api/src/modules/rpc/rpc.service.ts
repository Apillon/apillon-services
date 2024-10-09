import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  CreateRpcUrlDto,
  InfrastructureMicroservice,
  ListRpcUrlsForApiKeyQueryFilter,
  UpdateRpcUrlDto,
} from '@apillon/lib';

@Injectable()
export class RpcService {
  async listRpcApiKeys(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new InfrastructureMicroservice(context).listRpcApiKeys(query))
      .data;
  }

  async getApiKeyUsage(context: DevConsoleApiContext, id: number) {
    return (await new InfrastructureMicroservice(context).getRpcApiKeyUsage(id))
      .data;
  }

  async createRpcApiKey(
    context: DevConsoleApiContext,
    body: CreateRpcApiKeyDto,
  ) {
    return (await new InfrastructureMicroservice(context).createRpcApiKey(body))
      .data;
  }

  async updateRpcApiKey(
    context: DevConsoleApiContext,
    id: number,
    data: UpdateRpcUrlDto,
  ) {
    return (
      await new InfrastructureMicroservice(context).updateRpcApiKey(id, data)
    ).data;
  }

  async revokeRpcApiKey(context: DevConsoleApiContext, id: number) {
    return (await new InfrastructureMicroservice(context).revokeRpcApiKey(id))
      .data;
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

  async listRpcUrlsForApiKey(
    context: DevConsoleApiContext,
    query: ListRpcUrlsForApiKeyQueryFilter,
    apiKeyId: number,
  ) {
    query.apiKeyId = apiKeyId;
    return (
      await new InfrastructureMicroservice(context).listRpcUrlsForApiKey(query)
    ).data;
  }
}
