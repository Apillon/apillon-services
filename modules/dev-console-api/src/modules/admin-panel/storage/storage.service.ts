/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import {
  BucketQueryFilter,
  StorageMicroservice,
  WebsiteQueryFilter,
} from '@apillon/lib';

@Injectable()
export class StorageService {
  async getBucketList(context: DevConsoleApiContext, query: BucketQueryFilter) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }

  async getWebsiteList(
    context: DevConsoleApiContext,
    query: WebsiteQueryFilter,
  ) {
    return (await new StorageMicroservice(context).listWebsites(query)).data;
  }
}
