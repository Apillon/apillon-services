import {
  AttachedServiceType,
  CodeException,
  CreateWebsiteDto,
  DeploymentQueryFilter,
  DeployWebsiteDto,
  StorageMicroservice,
  ValidationException,
  ValidatorErrorCode,
  WebsiteQueryFilter,
  WebsitesQuotaReachedQueryFilter,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import { ServiceQueryFilter } from '../../services/dtos/services-query-filter.dto';
import { Service } from '../../services/models/service.model';
import { ServicesService } from '../../services/services.service';
import { ServiceDto } from '../../services/dtos/service.dto';

@Injectable()
export class HostingService {
  constructor(private readonly serviceService: ServicesService) {}

  async listWebsites(context: DevConsoleApiContext, query: WebsiteQueryFilter) {
    return (await new StorageMicroservice(context).listWebsites(query)).data;
  }

  async getWebsite(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).getWebsite(id)).data;
  }

  async createWebsite(context: DevConsoleApiContext, body: CreateWebsiteDto) {
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

    //Check if storage service for this project already exists
    const query: ServiceQueryFilter = new ServiceQueryFilter(
      {},
      context,
    ).populate({
      project_id: project.id,
      serviceType_id: AttachedServiceType.STORAGE,
    });
    const storageServices = await new Service({}).getServices(context, query);
    if (storageServices.total == 0) {
      //Create storage service - "Attach"
      const storageService: ServiceDto = new ServiceDto({}, context).populate({
        project_uuid: project.project_uuid,
        name: 'Storage service',
        serviceType_id: AttachedServiceType.STORAGE,
      });

      await this.serviceService.createService(context, storageService);
    }

    //Call Storage microservice, to create website
    return (await new StorageMicroservice(context).createWebsite(body)).data;
  }

  async updateWebsite(context: DevConsoleApiContext, id: number, body: any) {
    return (
      await new StorageMicroservice(context).updateWebsite({
        id: id,
        data: body,
      })
    ).data;
  }

  async isWebsitesQuotaReached(
    context: DevConsoleApiContext,
    query: WebsitesQuotaReachedQueryFilter,
  ) {
    return (
      await new StorageMicroservice(context).maxWebsitesQuotaReached(query)
    ).data.maxWebsitesQuotaReached;
  }

  async deployWebsite(
    context: DevConsoleApiContext,
    id: number,
    body: DeployWebsiteDto,
  ) {
    body.populate({ website_id: id });
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid()) {
        throw new ValidationException(body, ValidatorErrorCode);
      }
    }
    return (await new StorageMicroservice(context).deployWebsite(body)).data;
  }

  async listDeployments(
    context: DevConsoleApiContext,
    website_id: number,
    query: DeploymentQueryFilter,
  ) {
    query.website_id = website_id;
    try {
      await query.validate();
    } catch (err) {
      await query.handle(err);
      if (!query.isValid()) {
        throw new ValidationException(query, ValidatorErrorCode);
      }
    }

    return (await new StorageMicroservice(context).listDeployments(query)).data;
  }

  async getDeployment(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).getDeployment(id)).data;
  }
}
