import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import {
  AttachedServiceType,
  BaseProjectQueryFilter,
  CodeException,
  CreateRpcApiKeyDto,
  CreateRpcUrlDto,
  InfrastructureMicroservice,
  ListRpcUrlsForApiKeyQueryFilter,
  UpdateRpcApiKeyDto,
} from '@apillon/lib';
import { ServicesService } from '../services/services.service';
import { ProjectUser } from '../project/models/project-user.model';
import { ResourceNotFoundErrorCode } from '../../config/types';

@Injectable()
export class RpcService {
  constructor(private readonly serviceService: ServicesService) {}

  async listRpcApiKeys(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new InfrastructureMicroservice(context).listRpcApiKeys(query))
      .data;
  }

  async getApiKeyUsage(
    context: DevConsoleApiContext,
    id: number,
    project_uuid: string,
  ) {
    const projectOwner = await new ProjectUser({}, context).getProjectOwner(
      project_uuid,
    );

    if (!projectOwner) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return (
      await new InfrastructureMicroservice(context).getRpcApiKeyUsage(
        id,
        projectOwner.user_uuid,
      )
    ).data;
  }

  async getApiKeyUsagePerChain(
    context: DevConsoleApiContext,
    id: number,
    project_uuid: string,
  ) {
    const projectOwner = await new ProjectUser({}, context).getProjectOwner(
      project_uuid,
    );

    if (!projectOwner) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return (
      await new InfrastructureMicroservice(context).getRpcApiKeyUsagePerChain(
        id,
        projectOwner.user_uuid,
      )
    ).data;
  }

  async getApiKey(context: DevConsoleApiContext, id: number) {
    return (await new InfrastructureMicroservice(context).getRpcApiKey(id))
      .data;
  }

  async isRpcApiKeysQuotaReached(context: DevConsoleApiContext) {
    return (
      await new InfrastructureMicroservice(context).isRpcApiKeysQuotaReached()
    ).data;
  }

  async createRpcApiKey(
    context: DevConsoleApiContext,
    body: CreateRpcApiKeyDto,
  ) {
    const serviceCreated = await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.RPC,
    );

    if (serviceCreated) {
      // If service was created, RPC key is created automatically, so we need to return the last one
      const existingKeys = (
        await new InfrastructureMicroservice(context).listRpcApiKeys(
          new BaseProjectQueryFilter({
            project_uuid: body.project_uuid,
          }),
        )
      ).data;

      if (existingKeys.items.length > 0) {
        return existingKeys.items[existingKeys.items.length - 1];
      }
    }
    return (await new InfrastructureMicroservice(context).createRpcApiKey(body))
      .data;
  }

  async updateRpcApiKey(
    context: DevConsoleApiContext,
    id: number,
    data: UpdateRpcApiKeyDto,
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

  async listEndpoints(context: DevConsoleApiContext) {
    return (await new InfrastructureMicroservice(context).listEndpoints()).data;
  }
}
