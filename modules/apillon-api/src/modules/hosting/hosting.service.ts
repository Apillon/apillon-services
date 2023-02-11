import {
  DeployWebPageDto,
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

  async getWebPage(context: ApillonApiContext, id: any) {
    const wp = (await new StorageMicroservice(context).getWebPage(id)).data;
    delete wp['bucket'];
    delete wp['stagingBucket'];
    delete wp['productionBucket'];

    return wp;
  }

  async deployWebPage(
    context: ApillonApiContext,
    id: any,
    body: DeployWebPageDto,
  ) {
    body.populate({ webPage_id: id, clearBucketForUpload: true });
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid())
        throw new ValidationException(body, ValidatorErrorCode);
    }
    return (await new StorageMicroservice(context).deployWebPage(body)).data;
  }

  async getDeployment(context: ApillonApiContext, id: number) {
    return (await new StorageMicroservice(context).getDeployment(id)).data;
  }
}
