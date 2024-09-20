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
import { UserService } from '../user/user.service';
import { User } from '../user/models/user.model';
@Injectable()
export class RpcService {
  constructor(private readonly userService: UserService) {}

  async listRpcApiKeys(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new InfrastructureMicroservice(context).listRpcApiKeys(query))
      .data;
  }
  async getApiKeyUsage(context: DevConsoleApiContext, id: number) {
    const user = await new User({}, context).populateById(context.user.id);

    if (!user.exists()) {
      throw new Error('User not found');
    }

    const dwellirId = user.dwellir_id;

    if (!dwellirId) {
      throw new Error('Dwellir id not found');
    }

    return (
      await new InfrastructureMicroservice(context).getRpcApiKeyUsage(
        id,
        dwellirId,
      )
    ).data;
  }
  async createRpcApiKey(
    context: DevConsoleApiContext,
    body: CreateRpcApiKeyDto,
  ) {
    const { created, dwellirId } =
      await this.userService.getOrCreateDwellirId(context);
    body.dwellirUserId = dwellirId;
    body.triggerCreation = !created;
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
    const user = await new User({}, context).populateById(context.user.id);

    if (!user.exists()) {
      throw new Error('User not found');
    }

    const dwellirId = user.dwellir_id;

    if (!dwellirId) {
      throw new Error('Dwellir id not found');
    }

    return (
      await new InfrastructureMicroservice(context).revokeRpcApiKey(
        id,
        dwellirId,
      )
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
  async listRpcUrlsForApiKey(
    context: DevConsoleApiContext,
    query: ListRpcUrlsForApiKeyQueryFilter,
  ) {
    return (
      await new InfrastructureMicroservice(context).listRpcUrlsForApiKey(query)
    ).data;
  }
}
