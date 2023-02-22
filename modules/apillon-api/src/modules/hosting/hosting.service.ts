import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  EndFileUploadSessionDto,
} from '@apillon/lib';
import {
  DeployWebsiteDto,
  StorageMicroservice,
  ValidationException,
  ValidatorErrorCode,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class HostingService {
  async listDomains(context: ApillonApiContext) {
    return (await new StorageMicroservice(context).listDomains()).data;
  }

  async getWebsite(context: ApillonApiContext, id: any) {
    const wp = (await new StorageMicroservice(context).getWebsite(id)).data;
    delete wp['bucket'];
    delete wp['stagingBucket'];
    delete wp['productionBucket'];

    return wp;
  }

  async createS3SignedUrlsForWebsiteUpload(
    context: ApillonApiContext,
    website_uuid: string,
    body: ApillonHostingApiCreateS3UrlsForUploadDto,
  ) {
    body.populate(website_uuid);
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid())
        throw new ValidationException(body, ValidatorErrorCode);
    }

    return (
      await new StorageMicroservice(
        context,
      ).requestS3SignedURLsForWebsiteUpload(
        new ApillonHostingApiCreateS3UrlsForUploadDto().populate({
          ...body.serialize(),
          website_uuid: website_uuid,
          session_uuid: body.sessionUuid,
        }),
      )
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
    id: any,
    body: DeployWebsiteDto,
  ) {
    body.populate({ website_id: id, clearBucketForUpload: true });
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid())
        throw new ValidationException(body, ValidatorErrorCode);
    }
    return (await new StorageMicroservice(context).deployWebsite(body)).data;
  }

  async getDeployment(context: ApillonApiContext, id: number) {
    return (await new StorageMicroservice(context).getDeployment(id)).data;
  }
}
