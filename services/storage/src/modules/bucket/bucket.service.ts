import {
  BucketQueryFilter,
  BucketQuotaReachedQueryFilter,
  CacheKeyPrefix,
  CreateBucketDto,
  CreateBucketWebhookDto,
  Lmas,
  LogType,
  PopulateFrom,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  invalidateCacheMatch,
} from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { BucketType, StorageErrorCode } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import {
  StorageCodeException,
  StorageNotFoundException,
  StorageValidationException,
} from '../../lib/exceptions';
import { HostingService } from '../hosting/hosting.service';
import { BucketWebhook } from './models/bucket-webhook.model';
import { Bucket } from './models/bucket.model';

export class BucketService {
  static async listBuckets(
    event: { query: BucketQueryFilter },
    context: ServiceContext,
  ) {
    return await new Bucket(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new BucketQueryFilter(event.query));
  }

  static async getBucket(
    event: { id: string | number },
    context: ServiceContext,
  ) {
    const b = await new Bucket({}, context).populateById(event.id);
    if (!b.exists()) {
      throw new StorageNotFoundException();
    }
    b.canAccess(context);

    //get bucket max size quota from config service
    const maxBucketSizeQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_BUCKET_SIZE,
      project_uuid: b.project_uuid,
      object_uuid: b.bucket_uuid,
    });
    if (maxBucketSizeQuota?.value) {
      b.maxSize = maxBucketSizeQuota.value * 1073741824; //quota is in GB - convert to bytes
    }

    return b.serialize(SerializeFor.PROFILE);
  }

  static async createBucket(
    event: { body: CreateBucketDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = new Bucket(
      { ...event.body, bucket_uuid: uuidV4() },
      context,
    );
    //set default bucket size in bytes - NOTE this is not used in application. Max size is set in config MS
    b.maxSize = 5368709120;

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) {
        throw new StorageValidationException(b);
      }
    }

    //check max bucket quota
    if (
      b.bucketType == BucketType.STORAGE &&
      (
        await BucketService.maxBucketsQuotaReached(
          {
            query: new BucketQuotaReachedQueryFilter().populate({
              bucketType: b.bucketType,
              project_uuid: b.project_uuid,
            }),
          },
          context,
        )
      ).maxBucketsQuotaReached
    ) {
      throw new StorageCodeException({
        code: StorageErrorCode.MAX_BUCKETS_REACHED,
        status: 400,
      });
    }

    //Insert
    await b.insert();

    await new Lmas().writeLog({
      context,
      project_uuid: event.body.project_uuid,
      logType: LogType.INFO,
      message: 'New bucket created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
      data: b.serialize(),
    });
    await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
      projectUuid: b.project_uuid,
    });

    return b.serialize(SerializeFor.PROFILE);
  }

  static async updateBucket(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(event.id);

    if (!b.exists()) {
      throw new StorageNotFoundException();
    }
    b.canModify(context);

    b.populate(event.data, PopulateFrom.PROFILE);

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) {
        throw new StorageValidationException(b);
      }
    }

    await b.update();
    await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
      projectUuid: b.project_uuid,
    });
    return b.serialize(SerializeFor.PROFILE);
  }

  static async markBucketForDeletion(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(event.id);

    if (!b.exists()) {
      throw new StorageNotFoundException();
    } else if (b.status == SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_ALREADY_MARKED_FOR_DELETION,
        status: 400,
      });
    } else if (b.bucketType == BucketType.HOSTING) {
      throw new StorageCodeException({
        code: StorageErrorCode.CANNOT_DELETE_HOSTING_BUCKET,
        status: 400,
      });
    }
    b.canModify(context);

    await b.markForDeletion();
    await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
      projectUuid: b.project_uuid,
    });

    return b.serialize(SerializeFor.PROFILE);
  }

  static async unmarkBucketForDeletion(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(event.id);

    if (!b.exists()) {
      throw new StorageNotFoundException();
    } else if (b.status != SqlModelStatus.MARKED_FOR_DELETION) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_MARKED_FOR_DELETION,
        status: 400,
      });
    }
    b.canModify(context);

    b.status = SqlModelStatus.ACTIVE;
    await b.update();
    return b.serialize(SerializeFor.PROFILE);
  }

  static async clearBucketContent(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(event.id);

    if (!b.exists()) {
      throw new StorageNotFoundException();
    }
    b.canAccess(context);

    if (b.bucketType == BucketType.HOSTING) {
      return await HostingService.clearBucketContent({ bucket: b }, context);
    } else {
      throw new StorageCodeException({
        code: StorageErrorCode.CANNOT_CLEAR_STORAGE_BUCKET,
        status: 400,
      });
    }
  }

  static async maxBucketsQuotaReached(
    event: { query: BucketQuotaReachedQueryFilter },
    context: ServiceContext,
  ): Promise<any> {
    event.query = new BucketQuotaReachedQueryFilter(event.query, context);
    //Validation - call can be from other services or from this service - so validate that required fields are present
    try {
      await event.query.validate();
    } catch (err) {
      await event.query.handle(err);
      if (!event.query.isValid()) {
        throw new StorageValidationException(event.query);
      }
    }

    const numOfBuckets = await new Bucket(
      event.query,
      context,
    ).getNumOfBuckets();
    const maxBucketsQuota = await new Scs(context).getQuota({
      quota_id:
        event.query.bucketType == BucketType.STORAGE
          ? QuotaCode.MAX_FILE_BUCKETS
          : QuotaCode.MAX_HOSTING_BUCKETS,
      project_uuid: event.query.project_uuid,
      object_uuid: context.user.user_uuid,
    });
    return {
      maxBucketsQuotaReached: !!(
        maxBucketsQuota?.value && numOfBuckets >= maxBucketsQuota?.value
      ),
    };
  }
  //#region bucket webhook functions

  static async getBucketWebhook(
    event: { bucket_id: number },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateByBucketId(event.bucket_id);

    if (!webhook.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.BUCKET_WEBHOOK_NOT_FOUND,
      );
    }
    await webhook.canAccess(context);

    return webhook.serialize(SerializeFor.PROFILE);
  }

  static async createBucketWebhook(
    event: { body: CreateBucketWebhookDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(
      event.body.bucket_id,
    );

    if (!b.exists()) {
      throw new StorageNotFoundException();
    }

    b.canModify(context);

    const webhook: BucketWebhook = new BucketWebhook(event.body, context);
    try {
      await webhook.validate();
    } catch (err) {
      await webhook.handle(err);
      if (!webhook.isValid()) {
        throw new StorageValidationException(webhook);
      }
    }

    //Check if webhook for this bucket already exists
    if (
      (await new BucketWebhook({}, context).populateByBucketId(b.id)).exists()
    ) {
      throw new StorageCodeException({
        code: StorageErrorCode.WEBHOOK_ALREADY_EXISTS_FOR_PROJECT,
        status: 409,
      });
    }

    await webhook.insert();

    await new Lmas().writeLog({
      context,
      project_uuid: b.project_uuid,
      logType: LogType.INFO,
      message: 'New bucket webhook created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
      data: {
        bucket_uuid: b.bucket_uuid,
      },
    });

    return webhook.serialize(SerializeFor.PROFILE);
  }

  static async updateBucketWebhook(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateById(event.id);

    if (!webhook.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.BUCKET_WEBHOOK_NOT_FOUND,
      );
    }
    await webhook.canModify(context);

    webhook.populate(event.data);
    try {
      await webhook.validate();
    } catch (err) {
      await webhook.handle(err);
      if (!webhook.isValid()) {
        throw new StorageValidationException(webhook);
      }
    }

    await webhook.update();
    return webhook.serialize(SerializeFor.PROFILE);
  }

  static async deleteBucketWebhook(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateById(event.id);

    if (!webhook.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.BUCKET_WEBHOOK_NOT_FOUND,
      );
    }
    await webhook.canModify(context);

    await webhook.delete();
    return webhook.serialize(SerializeFor.PROFILE);
  }

  //#endregion
}
