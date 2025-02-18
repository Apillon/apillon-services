import { Injectable } from '@nestjs/common';
import {
  CreateBucketDto,
  StorageMicroservice,
  BucketQueryFilter,
  CreateBucketWebhookDto,
  AttachedServiceType,
  BucketQuotaReachedQueryFilter,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';
import { ServicesService } from '../../services/services.service';

@Injectable()
export class BucketService {
  constructor(private readonly serviceService: ServicesService) {}

  async getBucketList(context: DevConsoleApiContext, query: BucketQueryFilter) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }

  async getBucket(context: DevConsoleApiContext, bucket_uuid: string) {
    return (await new StorageMicroservice(context).getBucket(bucket_uuid)).data;
  }

  async isMaxBucketQuotaReached(
    context: DevConsoleApiContext,
    query: BucketQuotaReachedQueryFilter,
  ) {
    return (await new StorageMicroservice(context).maxBucketQuotaReached(query))
      .data.maxBucketsQuotaReached;
  }

  async createBucket(context: DevConsoleApiContext, body: CreateBucketDto) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.STORAGE,
    );

    //Call Storage microservice, to create bucket
    return (await new StorageMicroservice(context).createBucket(body)).data;
  }

  async updateBucket(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    body: any,
  ) {
    return (
      await new StorageMicroservice(context).updateBucket({
        bucket_uuid,
        data: body,
      })
    ).data;
  }

  async deleteBucket(context: DevConsoleApiContext, bucket_uuid: string) {
    return (
      await new StorageMicroservice(context).deleteBucket({ bucket_uuid })
    ).data;
  }

  async clearBucketContent(context: DevConsoleApiContext, bucket_uuid: string) {
    return (
      await new StorageMicroservice(context).clearBucketContent({ bucket_uuid })
    ).data;
  }

  //#region bucket webhook

  async getBucketWebhook(context: DevConsoleApiContext, bucket_uuid: string) {
    return (
      await new StorageMicroservice(context).getBucketWebhook(bucket_uuid)
    ).data;
  }

  async createBucketWebhook(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    body: CreateBucketWebhookDto,
  ) {
    body.populate({ bucket_uuid });
    return (await new StorageMicroservice(context).createBucketWebhook(body))
      .data;
  }

  async updateBucketWebhook(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    id: number,
    body: any,
  ) {
    return (
      await new StorageMicroservice(context).updateBucketWebhook({
        id,
        data: body,
      })
    ).data;
  }

  async deleteBucketWebhook(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteBucketWebhook({ id }))
      .data;
  }

  //#endregion
}
