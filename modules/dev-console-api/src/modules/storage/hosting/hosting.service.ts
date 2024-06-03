import {
  AttachedServiceType,
  CodeException,
  CreateWebsiteDto,
  DeploymentQueryFilter,
  DeployWebsiteDto,
  JwtTokenType,
  parseJwtToken,
  ShortUrlDto,
  StorageMicroservice,
  ModelValidationException,
  ValidatorErrorCode,
  WebsiteQueryFilter,
  WebsitesQuotaReachedQueryFilter,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BadRequestErrorCode,
  ResourceNotFoundErrorCode,
} from '../../../config/types';
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

  async getWebsite(context: DevConsoleApiContext, website_uuid: string) {
    return (await new StorageMicroservice(context).getWebsite(website_uuid))
      .data;
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

    //Check if hosting service for this project already exists
    const query: ServiceQueryFilter = new ServiceQueryFilter(
      {},
      context,
    ).populate({
      project_uuid: project.project_uuid,
      serviceType_id: AttachedServiceType.HOSTING,
    });
    const hostingServices = await new Service({}).getServices(context, query);
    if (hostingServices.total == 0) {
      //Create HOSTING service - "Attach"
      const storageService: ServiceDto = new ServiceDto({}, context).populate({
        project_uuid: project.project_uuid,
        name: 'Hosting service',
        serviceType_id: AttachedServiceType.HOSTING,
      });

      await this.serviceService.createService(context, storageService);
    }

    //Call Storage microservice, to create website
    return (await new StorageMicroservice(context).createWebsite(body)).data;
  }

  async updateWebsite(
    context: DevConsoleApiContext,
    website_uuid: string,
    body: any,
  ) {
    return (
      await new StorageMicroservice(context).updateWebsite({
        website_uuid,
        data: body,
      })
    ).data;
  }

  async archiveWebsite(context: DevConsoleApiContext, website_uuid: string) {
    return (await new StorageMicroservice(context).archiveWebsite(website_uuid))
      .data;
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
    website_uuid: string,
    body: DeployWebsiteDto,
  ) {
    body.populate({ website_uuid });
    await body.validateOrThrow(ModelValidationException, ValidatorErrorCode);
    return (await new StorageMicroservice(context).deployWebsite(body)).data;
  }

  async listDeployments(
    context: DevConsoleApiContext,
    website_uuid: string,
    query: DeploymentQueryFilter,
  ) {
    query.website_uuid = website_uuid;
    return (await new StorageMicroservice(context).listDeployments(query)).data;
  }

  async getDeployment(context: DevConsoleApiContext, deployment_uuid: string) {
    return (
      await new StorageMicroservice(context).getDeployment(deployment_uuid)
    ).data;
  }

  async approveWebsiteDeployment(
    context: DevConsoleApiContext,
    deployment_uuid: string,
    token: string,
  ) {
    //validate token
    const tokenData = parseJwtToken(JwtTokenType.WEBSITE_REVIEW_TOKEN, token);

    if (tokenData.deployment_uuid != deployment_uuid) {
      throw new CodeException({
        code: BadRequestErrorCode.INVALID_TOKEN_PAYLOAD,
        status: 400,
        errorCodes: BadRequestErrorCode,
      });
    }

    await new StorageMicroservice(context).approveWebsiteDeployment(
      deployment_uuid,
    );

    return 'Website APPROVED!';
  }

  async rejectWebsiteDeployment(
    context: DevConsoleApiContext,
    deployment_uuid: string,
    token: string,
  ) {
    //validate token
    const tokenData = parseJwtToken(JwtTokenType.WEBSITE_REVIEW_TOKEN, token);

    if (tokenData.deployment_uuid != deployment_uuid) {
      throw new CodeException({
        code: BadRequestErrorCode.INVALID_TOKEN_PAYLOAD,
        status: 400,
        errorCodes: BadRequestErrorCode,
      });
    }

    await new StorageMicroservice(context).rejectWebsiteDeployment(
      deployment_uuid,
    );

    return 'Website REJECTED!.';
  }

  async generateShortUrl(body: ShortUrlDto, context: DevConsoleApiContext) {
    return (await new StorageMicroservice(context).generateShortUrl(body)).data;
  }
}
