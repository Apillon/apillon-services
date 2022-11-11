import {
  Ams,
  ApiKeyQueryFilter,
  CodeException,
  CreateApiKeyDto,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';

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

    return (await new Ams(context).createApiKey(body)).data;
  }

  async deleteApiKey(context: DevConsoleApiContext, id: number) {
    return (await new Ams(context).deleteApiKey({ id: id })).data;
  }
}
