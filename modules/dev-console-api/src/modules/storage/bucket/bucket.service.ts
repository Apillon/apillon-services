import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateBucketDto,
  StorageMicroservice,
  BucketQueryFilter,
  CodeException,
  CreateBucketWebhookDto,
  AttachedServiceType,
  BucketQuotaReachedQueryFilter,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import { Service } from '../../services/models/service.model';
import { ServiceQueryFilter } from '../../services/dtos/services-query-filter.dto';
import { ServicesService } from '../../services/services.service';
import { ServiceDto } from '../../services/dtos/service.dto';

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
    const project = await new Project({}, context).populateByUUIDOrThrow(
      body.project_uuid,
    );

    //Check if storage service for this project already exists
    const query: ServiceQueryFilter = new ServiceQueryFilter(
      {},
      context,
    ).populate({
      project_uuid: project.project_uuid,
      serviceType_id: AttachedServiceType.STORAGE,
    });
    const storageServices = await new Service({}).getServices(context, query);
    if (storageServices.total == 0) {
      //Create storage service - "Attach"
      const storageService: ServiceDto = new ServiceDto({}, context).populate({
        project_uuid: project.project_uuid,
        name: 'Storage service',
        serviceType_id: AttachedServiceType.STORAGE,
      });

      await this.serviceService.createService(context, storageService);
    }

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
        id: id,
        data: body,
      })
    ).data;
  }

  async deleteBucketWebhook(context: DevConsoleApiContext, id: number) {
    return (
      await new StorageMicroservice(context).deleteBucketWebhook({ id: id })
    ).data;
  }

  //#endregion
}
