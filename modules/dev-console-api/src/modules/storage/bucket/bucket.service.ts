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
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

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

  async deleteBucket(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteBucket({ id: id }))
      .data;
  }

  async cancelBucketDeletion(context: DevConsoleApiContext, id: number) {
    return (
      await new StorageMicroservice(context).cancelBucketDeletion({ id: id })
    ).data;
  }

  async clearBucketContent(context: DevConsoleApiContext, id: number) {
    return (
      await new StorageMicroservice(context).clearBucketContent({ id: id })
    ).data;
  }

  //#region bucket webhook

  async getBucketWebhook(context: DevConsoleApiContext, bucket_id: number) {
    return (await new StorageMicroservice(context).getBucketWebhook(bucket_id))
      .data;
  }

  async createBucketWebhook(
    context: DevConsoleApiContext,
    bucket_id: number,
    body: CreateBucketWebhookDto,
  ) {
    body.populate({ bucket_id: bucket_id });
    return (await new StorageMicroservice(context).createBucketWebhook(body))
      .data;
  }

  async updateBucketWebhook(
    context: DevConsoleApiContext,
    bucket_id: number,
    id: number,
    body: any,
  ) {
    body.bucket_id = bucket_id;
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
