import {
  Ams,
  ApiKeyQueryFilter,
  ApiKeyRoleDto,
  CodeException,
  CreateApiKeyDto,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { Service } from '../services/models/service.model';

@Injectable()
export class ApiKeyService {
  async getApiKeyList(context: DevConsoleApiContext, query: ApiKeyQueryFilter) {
    return (await new Ams(context).listApiKeys(query)).data;
  }

  async createApiKey(context: DevConsoleApiContext, body: CreateApiKeyDto) {
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

    //roles - check if services exists & set serviceType
    if (body.roles && body.roles.length > 0) {
      for (const apiKeyRole of body.roles) {
        const service: Service = await new Service({}, context).populateByUUID(
          apiKeyRole.service_uuid,
        );

        if (!service.exists()) {
          throw new CodeException({
            code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
            status: HttpStatus.NOT_FOUND,
            errorCodes: ResourceNotFoundErrorCode,
          });
        }

        apiKeyRole.serviceType_id = service.serviceType_id;
      }
    }

    return (await new Ams(context).createApiKey(body)).data;
  }

  async deleteApiKey(context: DevConsoleApiContext, id: number) {
    return (await new Ams(context).deleteApiKey({ id: id })).data;
  }

  async assignRoleToApiKey(context: DevConsoleApiContext, body: ApiKeyRoleDto) {
    return (await new Ams(context).assignRoleToApiKey(body)).data;
  }

  async removeApiKeyRole(context: DevConsoleApiContext, body: ApiKeyRoleDto) {
    return (await new Ams(context).removeApiKeyRole(body)).data;
  }

  async getApiKeyRoles(context: DevConsoleApiContext, id: number) {
    return (await new Ams(context).getApiKeyRoles({ apiKey_id: id })).data;
  }
}
