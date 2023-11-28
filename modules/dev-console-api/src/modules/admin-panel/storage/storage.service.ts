/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { BucketQueryFilter, StorageMicroservice } from '@apillon/lib';

@Injectable()
export class StorageService {
  async getBucketList(context: DevConsoleApiContext, query: BucketQueryFilter) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }
}
