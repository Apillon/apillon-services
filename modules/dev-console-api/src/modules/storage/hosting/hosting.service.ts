import {
  CodeException,
  CreateWebPageDto,
  DeploymentQueryFilter,
  DeployWebPageDto,
  StorageMicroservice,
  ValidationException,
  ValidatorErrorCode,
  WebPageQueryFilter,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';

@Injectable()
export class HostingService {
  async listWebPages(context: DevConsoleApiContext, query: WebPageQueryFilter) {
    return (await new StorageMicroservice(context).listWebPages(query)).data;
  }

  async getWebPage(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).getWebPage(id)).data;
  }

  async createWebPage(context: DevConsoleApiContext, body: CreateWebPageDto) {
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

    //Call Storage microservice, to create webPage
    return (await new StorageMicroservice(context).createWebPage(body)).data;
  }

  async updateWebPage(context: DevConsoleApiContext, id: number, body: any) {
    return (
      await new StorageMicroservice(context).updateWebPage({
        id: id,
        data: body,
      })
    ).data;
  }

  async deployWebPage(
    context: DevConsoleApiContext,
    id: number,
    body: DeployWebPageDto,
  ) {
    body.populate({ webPage_id: id });
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid())
        throw new ValidationException(body, ValidatorErrorCode);
    }
    return (await new StorageMicroservice(context).deployWebPage(body)).data;
  }

  async listDeployments(
    context: DevConsoleApiContext,
    webPage_id: number,
    query: DeploymentQueryFilter,
  ) {
    query.webPage_id = webPage_id;
    try {
      await query.validate();
    } catch (err) {
      await query.handle(err);
      if (!query.isValid())
        throw new ValidationException(query, ValidatorErrorCode);
    }

    return (await new StorageMicroservice(context).listDeployments(query)).data;
  }

  async getDeployment(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).getDeployment(id)).data;
  }
}
