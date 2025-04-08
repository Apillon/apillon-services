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
  Ams,
  CreateApiKeyDto,
  ApiKeyRoleBaseDto,
  DefaultApiKeyRole,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { BadRequestErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { ServicesService } from '../../services/services.service';
import { ServiceQueryFilter } from '../../services/dtos/services-query-filter.dto';

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
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.HOSTING,
    );

    if (
      body.deploymentConfig &&
      (!body.deploymentConfig.apiKey || !body.deploymentConfig.apiKey)
    ) {
      const serviceList = await this.serviceService.getServiceList(
        context,
        new ServiceQueryFilter({}, context).populate({
          project_uuid: body.project_uuid,
        }),
      );

      const hostingService = serviceList.items.find(
        (item) => item.serviceType_id === AttachedServiceType.HOSTING,
      );

      const storageService = serviceList.items.find(
        (item) => item.serviceType_id === AttachedServiceType.STORAGE,
      );

      const accessMS = new Ams(context);

      const createdApiKey = await accessMS.createApiKey(
        new CreateApiKeyDto({}, context).populate({
          project_uuid: body.project_uuid,
          name: `Deployment API Key - ${body.name}`,
          testNetwork: false,
          roles: [
            new ApiKeyRoleBaseDto({}, context).populate({
              role_id: DefaultApiKeyRole.KEY_EXECUTE,
              project_uuid: body.project_uuid,
              service_uuid: hostingService.service_uuid,
              serviceType_id: AttachedServiceType.HOSTING,
            }),
            new ApiKeyRoleBaseDto({}, context).populate({
              role_id: DefaultApiKeyRole.KEY_READ,
              project_uuid: body.project_uuid,
              service_uuid: hostingService.service_uuid,
              serviceType_id: AttachedServiceType.HOSTING,
            }),
            new ApiKeyRoleBaseDto({}, context).populate({
              role_id: DefaultApiKeyRole.KEY_EXECUTE,
              project_uuid: body.project_uuid,
              service_uuid: storageService.service_uuid,
              serviceType_id: AttachedServiceType.STORAGE,
            }),
            new ApiKeyRoleBaseDto({}, context).populate({
              role_id: DefaultApiKeyRole.KEY_READ,
              project_uuid: body.project_uuid,
              service_uuid: storageService.service_uuid,
              serviceType_id: AttachedServiceType.STORAGE,
            }),
          ],
        }),
      );

      body.deploymentConfig.apiKey = createdApiKey.data.apiKey;
      body.deploymentConfig.apiSecret = createdApiKey.data.apiKeySecret;
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

  async activateWebsite(context: DevConsoleApiContext, website_uuid: string) {
    return (
      await new StorageMicroservice(context).activateWebsite(website_uuid)
    ).data;
  }

  async checkWebsiteDomain(
    context: DevConsoleApiContext,
    website_uuid: string,
  ) {
    return (
      await new StorageMicroservice(context).checkWebsiteDomainDns(website_uuid)
    ).data;
  }

  async removeWebsiteDomain(
    context: DevConsoleApiContext,
    website_uuid: string,
  ) {
    return (
      await new StorageMicroservice(context).removeWebsiteDomain(website_uuid)
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
