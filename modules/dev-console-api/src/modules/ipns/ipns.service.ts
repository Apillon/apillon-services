import {
  CreateIpnsDto,
  IpnsQueryFilter,
  PublishIpnsDto,
  StorageMicroservice,
  ValidationException,
  ValidatorErrorCode,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class IpnsService {
  async getIpnsList(
    context: DevConsoleApiContext,
    bucket_id: number,
    query: IpnsQueryFilter,
  ) {
    query.populate({ bucket_id: bucket_id });
    return (await new StorageMicroservice(context).listIpnses(query)).data;
  }

  async createIpns(
    context: DevConsoleApiContext,
    bucket_id: number,
    body: CreateIpnsDto,
  ) {
    body.populate({ bucket_id: bucket_id });
    return (await new StorageMicroservice(context).createIpns(body)).data;
  }

  async updateIpns(context: DevConsoleApiContext, id: number, body: any) {
    return (
      await new StorageMicroservice(context).updateIpns({ id: id, data: body })
    ).data;
  }

  async deleteIpns(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteIpns({ id: id })).data;
  }

  async publishIpns(
    context: DevConsoleApiContext,
    id: number,
    body: PublishIpnsDto,
  ) {
    body.populate({ ipns_id: id });
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid())
        throw new ValidationException(body, ValidatorErrorCode);
    }

    return (await new StorageMicroservice(context).publishIpns(body)).data;
  }
}
