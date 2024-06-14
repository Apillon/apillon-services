import {
  CreateIpnsDto,
  IpnsQueryFilter,
  PublishIpnsDto,
  StorageMicroservice,
  ModelValidationException,
  ValidatorErrorCode,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';

@Injectable()
export class IpnsService {
  async getIpnsList(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: IpnsQueryFilter,
  ) {
    query.populate({ bucket_uuid });
    return (await new StorageMicroservice(context).listIpnses(query)).data;
  }

  async getIpns(context: DevConsoleApiContext, ipns_uuid: string) {
    return (await new StorageMicroservice(context).getIpns(ipns_uuid)).data;
  }

  async createIpns(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    body: CreateIpnsDto,
  ) {
    body.populate({ bucket_uuid: bucket_uuid });
    return (await new StorageMicroservice(context).createIpns(body)).data;
  }

  async updateIpns(
    context: DevConsoleApiContext,
    ipns_uuid: string,
    body: any,
  ) {
    return (
      await new StorageMicroservice(context).updateIpns({
        ipns_uuid,
        data: body,
      })
    ).data;
  }

  async deleteIpns(context: DevConsoleApiContext, ipns_uuid: string) {
    return (await new StorageMicroservice(context).deleteIpns({ ipns_uuid }))
      .data;
  }

  async publishIpns(
    context: DevConsoleApiContext,
    ipns_uuid: string,
    body: PublishIpnsDto,
  ) {
    body.populate({ ipns_uuid });
    await body.validateOrThrow(ModelValidationException, ValidatorErrorCode);

    return (await new StorageMicroservice(context).publishIpns(body)).data;
  }
}
