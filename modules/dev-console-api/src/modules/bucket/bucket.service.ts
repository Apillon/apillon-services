import { Injectable } from '@nestjs/common';
import { CreateBucketDto, StorageMicroservice } from 'at-lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class BucketService {
  async createBucket(context: DevConsoleApiContext, body: CreateBucketDto) {
    //TODO: Check limits, if project actually exists ...

    //Call Storage microservice, to create bucket
    return (await new StorageMicroservice().createBucket(body)).data;
  }
}
