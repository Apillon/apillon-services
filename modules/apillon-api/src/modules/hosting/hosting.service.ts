import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  CreateWebsiteDto,
  DeploymentQueryFilter,
  DomainQueryFilter,
  EndFileUploadSessionDto,
  ShortUrlDto,
  WebsiteQueryFilter,
} from '@apillon/lib';
import {
  DeployWebsiteDto,
  StorageMicroservice,
  ModelValidationException,
  ValidatorErrorCode,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class HostingService {
  async listDomains(context: ApillonApiContext, query: DomainQueryFilter) {
    return (await new StorageMicroservice(context).listDomains(query)).data;
  }

  async listWebsites(context: ApillonApiContext, query: WebsiteQueryFilter) {
    return (await new StorageMicroservice(context).listWebsites(query)).data;
  }

  async createWebsite(context: ApillonApiContext, body: CreateWebsiteDto) {
    //Call Storage microservice, to create website
    return (await new StorageMicroservice(context).createWebsite(body)).data;
  }

  async getWebsite(context: ApillonApiContext, website_uuid: string) {
    return (await new StorageMicroservice(context).getWebsite(website_uuid))
      .data;
  }

  async createS3SignedUrlsForWebsiteUpload(
    context: ApillonApiContext,
    website_uuid: string,
    body: ApillonHostingApiCreateS3UrlsForUploadDto,
  ) {
    body.populate({ website_uuid });
    await body.validateOrThrow(ModelValidationException, ValidatorErrorCode);

    return (
      await new StorageMicroservice(
        context,
      ).requestS3SignedURLsForWebsiteUpload(body)
    ).data;
  }

  async endFileUploadSession(
    context: ApillonApiContext,
    website_uuid: string,
    session_uuid: string,
    body: EndFileUploadSessionDto,
  ) {
    return (
      await new StorageMicroservice(context).endFileUploadSession(
        session_uuid,
        body,
      )
    ).data;
  }

  async deployWebsite(
    context: ApillonApiContext,
    website_uuid: string,
    body: DeployWebsiteDto,
  ) {
    body.populate({ website_uuid, clearBucketForUpload: true });
    await body.validateOrThrow(ModelValidationException, ValidatorErrorCode);
    return (await new StorageMicroservice(context).deployWebsite(body)).data;
  }

  async listDeployments(
    context: ApillonApiContext,
    website_uuid: string,
    query: DeploymentQueryFilter,
  ) {
    query.website_uuid = website_uuid;
    return (await new StorageMicroservice(context).listDeployments(query)).data;
  }

  async getDeployment(context: ApillonApiContext, deployment_uuid: string) {
    return (
      await new StorageMicroservice(context).getDeployment(deployment_uuid)
    ).data;
  }

  async generateShortUrl(body: ShortUrlDto, context: ApillonApiContext) {
    return (await new StorageMicroservice(context).generateShortUrl(body)).data;
  }
}
