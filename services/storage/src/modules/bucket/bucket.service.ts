import {
  BucketQueryFilter,
  BucketQuotaReachedQueryFilter,
  CacheKeyPrefix,
  CreateBucketDto,
  CreateBucketWebhookDto,
  Lmas,
  LogType,
  Mailing,
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
    event: { bucket_uuid: string },
    context: ServiceContext,
  ) {
    const b: Bucket = await new Bucket(
      {},
      context,
    ).populateByUuidAndCheckAccess(event.bucket_uuid);

    return b.serializeByContext();
  }

  static async createBucket(
    event: { body: CreateBucketDto },
    context: ServiceContext,
  ): Promise<any> {
    const bucket: Bucket = new Bucket(
      {
        ...event.body,
        bucket_uuid: uuidV4(),
        createTime: new Date(),
        updateTime: new Date(),
      },
      context,
    );

    await bucket.validateOrThrow(StorageValidationException);

    //Insert
    await bucket.insert();

    await Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: event.body.project_uuid,
        logType: LogType.INFO,
        message: 'New bucket created',
        location: 'BucketService/createBucket',
        service: ServiceName.STORAGE,
        data: bucket.serialize(),
      }),
      invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
        project_uuid: bucket.project_uuid,
      }),
      // Set mailerlite field indicating the user created a bucket
      new Mailing(context).setMailerliteField('has_bucket'),
    ]);

    return bucket.serializeByContext();
  }

  static async updateBucket(
    event: { bucket_uuid: string; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.bucket_uuid,
    );

    if (!bucket.exists()) {
      throw new StorageNotFoundException();
    }
    bucket.canModify(context);

    bucket.populate(event.data, PopulateFrom.PROFILE);

    await bucket.validateOrThrow(StorageValidationException);

    await bucket.update();
    await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
      project_uuid: bucket.project_uuid,
    });
    return bucket.serialize(SerializeFor.PROFILE);
  }

  static async deleteBucket(
    event: { bucket_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const b = await new Bucket({}, context).populateById(event.bucket_uuid);

    if (!b.exists()) {
      throw new StorageNotFoundException();
    } else if (b.bucketType == BucketType.HOSTING) {
      throw new StorageCodeException({
        code: StorageErrorCode.CANNOT_DELETE_HOSTING_BUCKET,
        status: 400,
      });
    }
    b.canModify(context);

    //Bucket cannot be deleted if there are files in it
    if (await b.containsFiles()) {
      throw new StorageCodeException({
        code: StorageErrorCode.CANNOT_DELETE_BUCKET_WITH_FILES,
        status: 400,
      });
    }

    await Promise.all([
      b.markDeleted(),
      invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
        project_uuid: b.project_uuid,
      }),
    ]);

    return true;
  }

  static async clearBucketContent(
    event: { bucket_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(
      event.bucket_uuid,
    );

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
    // Validation - call can be from other services or from this service - so validate that required fields are present
    event.query = new BucketQuotaReachedQueryFilter(event.query, context);
    await event.query.validateOrThrow(StorageValidationException);

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
    });
    return {
      maxBucketsQuotaReached: !!(
        maxBucketsQuota?.value && numOfBuckets >= maxBucketsQuota?.value
      ),
    };
  }
  //#region bucket webhook functions

  static async getBucketWebhook(
    event: { bucket_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const webhook: BucketWebhook = await new BucketWebhook(
      {},
      context,
    ).populateByBucketUuid(event.bucket_uuid);

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
    const b: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );

    if (!b.exists()) {
      throw new StorageNotFoundException();
    }

    b.canModify(context);

    const webhook: BucketWebhook = new BucketWebhook(
      { ...event.body, bucket_id: b.id },
      context,
    );
    await webhook.validateOrThrow(StorageValidationException);

    //Check if webhook for this bucket already exists
    if (
      (
        await new BucketWebhook({}, context).populateByBucketUuid(b.bucket_uuid)
      ).exists()
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
        webhook: webhook.serialize(),
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
    await webhook.validateOrThrow(StorageValidationException);

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
