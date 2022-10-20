import { Injectable } from '@nestjs/common';
import {
  CreateBucketDto,
  StorageMicroservice,
  BucketQueryFilter,
} from 'at-lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class BucketService {
  async getBucketList(context: DevConsoleApiContext, query: BucketQueryFilter) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }

  async createBucket(context: DevConsoleApiContext, body: CreateBucketDto) {
    //TODO: Check limits, if project actually exists ...

    //Call Storage microservice, to create bucket
    return (await new StorageMicroservice(context).createBucket(body)).data;
  }

  async updateBucket(context: DevConsoleApiContext, id: number, body: any) {
    return (
      await new StorageMicroservice(context).updateBucket({
        id: id,
        data: body,
      })
    ).data;
  }

  async deleteBucket(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteBucket({ id: id }))
      .data;
  }
}
