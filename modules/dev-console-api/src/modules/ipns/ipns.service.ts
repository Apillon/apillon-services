import { CreateIpnsDto, StorageMicroservice } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class IpnsService {
  async createIpnsRecord(
    context: DevConsoleApiContext,
    bucket_id: number,
    body: CreateIpnsDto,
  ) {
    body.populate({ bucket_id: bucket_id });
    return (await new StorageMicroservice(context).createIpns(body)).data;
  }
}
